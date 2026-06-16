import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models

raw_edges = [
  (0, 1), (0, 2), (1, 3), (2, 4),
  (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),
  (11, 12), (5, 11), (6, 12),
  (11, 13), (13, 15), (12, 14), (14, 16)
]

def get_adjacency_matrix(num_joints=17):
  A = np.zeros((num_joints, num_joints))
  for i, j in raw_edges:
    A[i, j] = 1
    A[j, i] = 1
  A = A + np.eye(num_joints)
  D = np.diag(np.sum(A, axis=1) ** (-0.5))
  return np.dot(np.dot(D, A), D).astype(np.float32)

A_NORM = get_adjacency_matrix()

# GCN Spatial Graph Block
@keras.utils.register_keras_serializable()
class GraphConv(layers.Layer):
  def __init__(self, out_channels, num_vertices=17, adaptive=True, **kwargs):
    super().__init__(**kwargs)
    self.out_channels = out_channels
    self.num_vertices = num_vertices
    self.adaptive = adaptive

  def build(self, input_shape):
    in_channels = input_shape[-1]

    self.channel_proj = layers.Conv2D(
      self.out_channels, kernel_size=(1, 1),
      padding='same', use_bias=False
    )
    self.bn_proj = layers.BatchNormalization()

    self.graph_kernel = self.add_weight(
      name='graph_kernel',
      shape=(1, self.num_vertices, self.out_channels, 1),
      initializer=tf.keras.initializers.Constant(
        A_NORM[0:1, :].T.reshape(1, self.num_vertices, 1, 1)
        * np.ones((1, self.num_vertices, self.out_channels, 1))
      ),
      trainable=self.adaptive
    )
    self.bn_graph = layers.BatchNormalization()

    if in_channels != self.out_channels:
      self.downsample = keras.Sequential([
        layers.Conv2D(self.out_channels, (1, 1), use_bias=False),
        layers.BatchNormalization()
      ])
    else:
      self.downsample = None

    super().build(input_shape)

  def call(self, x):
    residual = self.downsample(x) if self.downsample is not None else x

    out = self.bn_proj(self.channel_proj(x))  # (B, T, V, C_out)

    out = tf.nn.depthwise_conv2d(
      out,
      filter=self.graph_kernel,
      strides=[1, 1, 1, 1],
      padding='SAME'
    )  # (B, T, V, C_out)

    out = self.bn_graph(out)
    return tf.nn.relu6(out + residual)

  def get_config(self):
    cfg = super().get_config()
    cfg.update({
      'out_channels': self.out_channels,
      'num_vertices': self.num_vertices,
      'adaptive': self.adaptive
    })
    return cfg

# Temporal Attention Mechanism
@keras.utils.register_keras_serializable()
class TCNBlock(layers.Layer):
  def __init__(self, filters, **kwargs):
    super().__init__(**kwargs)
    self.filters = filters

  def build(self, input_shape):
    f1 = self.filters // 3
    f2 = self.filters // 3
    f3 = self.filters - f1 - f2

    self.res_conv = layers.Conv2D(self.filters, (1, 1), padding='same', use_bias=False)
    self.res_bn   = layers.BatchNormalization()

    self.b1_conv = layers.Conv2D(f1, (3, 1), padding='same',
                                  dilation_rate=(1, 1), use_bias=False)
    self.b1_bn   = layers.BatchNormalization()

    self.b2_conv = layers.Conv2D(f2, (3, 1), padding='same',
                                  dilation_rate=(2, 1), use_bias=False)
    self.b2_bn   = layers.BatchNormalization()

    self.b3_conv = layers.Conv2D(f3, (3, 1), padding='same',
                                  dilation_rate=(4, 1), use_bias=False)
    self.b3_bn   = layers.BatchNormalization()

    self.concat     = layers.Concatenate(axis=-1)
    self.act_concat = layers.Activation('relu6')

    squeeze_ch = max(1, self.filters // 8)
    self._temporal_len = int(input_shape[1])  # static T, diketahui saat build

    self.ca_pool = layers.AveragePooling2D(pool_size=(self._temporal_len, 1),
                                            padding='valid')
    self.ca_conv1 = layers.Conv2D(squeeze_ch, (1, 1), padding='same', use_bias=False)
    self.ca_act1  = layers.Activation('relu6')
    self.ca_conv2 = layers.Conv2D(self.filters, (1, 1), padding='same', use_bias=False)
    self.ca_act2  = layers.Activation('sigmoid')
    self.ca_mul   = layers.Multiply()

    self.add       = layers.Add()
    self.final_act = layers.Activation('relu6')

    super().build(input_shape)

  def call(self, x):
    residual = self.res_bn(self.res_conv(x))

    b1 = self.b1_bn(self.b1_conv(x))
    b2 = self.b2_bn(self.b2_conv(x))
    b3 = self.b3_bn(self.b3_conv(x))

    out = self.act_concat(self.concat([b1, b2, b3]))  # (B, T, V, C)

    ca = self.ca_pool(out)                 # (B, 1, V, C)
    ca = self.ca_act1(self.ca_conv1(ca))   # (B, 1, V, C//8)
    ca = self.ca_act2(self.ca_conv2(ca))   # (B, 1, V, C)
    out = self.ca_mul([out, ca])           # broadcast (B,T,V,C)*(B,1,V,C)

    return self.final_act(self.add([out, residual]))

  def compute_output_shape(self, input_shape):
    return (input_shape[0], input_shape[1], input_shape[2], self.filters)

  def get_config(self):
    cfg = super().get_config()
    cfg.update({'filters': self.filters})
    return cfg

@keras.utils.register_keras_serializable()
class EarlyReshape(layers.Layer):
  def call(self, inputs):
    shape = tf.shape(inputs)
    B = shape[0]
    return tf.reshape(inputs, [B * 3, 100, 17, 3])

  def compute_output_shape(self, input_shape):
    return (None, 100, 17, 3)

@keras.utils.register_keras_serializable()
class LatePoolingTrain(layers.Layer):
  def __init__(self, hidden_dim, **kwargs):
    super().__init__(**kwargs)
    self.hidden_dim = hidden_dim

  def call(self, inputs):
    x = tf.reshape(inputs, [-1, 3, self.hidden_dim])
    return tf.reduce_max(x, axis=1)

  def compute_output_shape(self, input_shape):
    return (None, self.hidden_dim)

  def get_config(self):
    cfg = super().get_config()
    cfg.update({'hidden_dim': self.hidden_dim})
    return cfg

@keras.utils.register_keras_serializable()
class LatePoolingTPU(layers.Layer):
  def __init__(self, hidden_dim, **kwargs):
    super().__init__(**kwargs)
    self.hidden_dim = hidden_dim

  def call(self, inputs):
      # inputs: (3, hidden_dim)
    x = tf.reshape(inputs, [1, 3, self.hidden_dim])
    return tf.reduce_max(x, axis=1)  # (1, hidden_dim)

  def compute_output_shape(self, input_shape):
    return (1, self.hidden_dim)

  def get_config(self):
    cfg = super().get_config()
    cfg.update({'hidden_dim': self.hidden_dim})
    return cfg

def build_gnn_train_model(num_classes=5, hidden_gcn=64, gcn_block_1=1, gcn_block_2=2, gcn_block_3=2, dropout_rate=0.5):
  M = 3; T = 100; V = 17; C = 3
  final_hidden_dim = hidden_gcn * 8

  inputs = keras.Input(shape=(M, T, V, C), name="input_tensor")
  x = EarlyReshape(name="early_reshape")(inputs)

  # --- SPATIAL GCN PROCESSING ---
  for i in range(gcn_block_1):
    x = GraphConv(hidden_gcn, V, adaptive=True, name=f"gcn_block1_{i}")(x)

  for i in range(gcn_block_2):
    x = GraphConv(hidden_gcn * 2, V, adaptive=True, name=f"gcn_block2_{i}")(x)

  for i in range(gcn_block_3):
    x = GraphConv(hidden_gcn * 4, V, adaptive=True, name=f"gcn_block3_{i}")(x)

  x = layers.AveragePooling2D(pool_size=(1, V))(x)

  # --- TEMPORAL CONVOLUTION (TCN) ---
  x = TCNBlock(hidden_gcn * 4, name="TCN_1")(x)
  x = layers.MaxPooling2D(pool_size=(2, 1))(x)

  x = TCNBlock(hidden_gcn * 8, name="TCN_2")(x)
  x = layers.MaxPooling2D(pool_size=(2, 1))(x)

  # Output shape: (Batch * M, hidden_gcn * 4)
  x = layers.GlobalAveragePooling2D(name="temporal_pooling")(x)

  # --- LATE POOLING ---
  x = LatePoolingTrain(hidden_dim=final_hidden_dim, name="late_pooling_train")(x)

  # --- KLASIFIKASI AKHIR ---
  x = layers.Dense(final_hidden_dim, activation='relu6')(x)
  x = layers.Dropout(dropout_rate, name="dropout")(x)

  outputs = layers.Dense(num_classes, activation='softmax')(x)

  model = keras.Model(inputs=inputs, outputs=outputs, name="GNN_TCN_TPU")
  return model

def build_gnn_backbone_model(hidden_gcn=64, gcn_block_1=1, gcn_block_2=2, gcn_block_3=2):
  T, V, C = 100, 17, 3
  hidden_dim = hidden_gcn * 8

  inputs = keras.Input(batch_shape=(1, T, V, C), name="input_tensor")
  x = inputs

  for i in range(gcn_block_1):
    x = GraphConv(hidden_gcn, V, adaptive=True, name=f"gcn_s1_{i}")(x)
  for i in range(gcn_block_2):
    x = GraphConv(hidden_gcn * 2, V, adaptive=True, name=f"gcn_s2_{i}")(x)
  for i in range(gcn_block_3):
    x = GraphConv(hidden_gcn * 4, V, adaptive=True, name=f"gcn_s3_{i}")(x)

  x = layers.AveragePooling2D(pool_size=(1, V), name="joint_pool")(x)

  x = TCNBlock(hidden_gcn * 4, name="tcn_1")(x)
  x = layers.MaxPooling2D(pool_size=(2, 1), name="tpool_1")(x)

  x = TCNBlock(hidden_gcn * 8, name="tcn_2")(x)
  x = layers.MaxPooling2D(pool_size=(2, 1), name="tpool_2")(x)

  outputs = layers.GlobalAveragePooling2D(name="temporal_gap")(x)

  return keras.Model(inputs=inputs, outputs=outputs, name="GCN_Backbone_Edge")

def build_gnn_head_model(num_classes=5, hidden_gcn=64):
  hidden_dim = hidden_gcn * 8

  inputs = keras.Input(shape=(hidden_dim,), name="pooled_features")

  x = layers.Dense(hidden_dim, activation='relu6', name="fc1")(inputs)
  outputs = layers.Dense(num_classes, activation='softmax', name="predictions")(x)

  return keras.Model(inputs=inputs, outputs=outputs, name="GCN_Head_Edge")