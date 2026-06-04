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

def get_adjacency_matrix():
  A = np.zeros((17, 17))
  for i, j in raw_edges:
    A[i, j] = 1
    A[j, i] = 1
  A = A + np.eye(17)

  # Normalize
  D = np.diag(np.sum(A, axis=1) ** (-0.5))
  A_norm = np.dot(np.dot(D, A), D)
  return tf.constant(A_norm, dtype=tf.float32)

A_tensor = get_adjacency_matrix()

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

        self.conv = layers.Conv2D(self.out_channels, kernel_size=1, use_bias=False)
        self.bn = layers.BatchNormalization()

        if self.adaptive:
            # Menggunakan tf.Variable untuk parameter yang bisa dipelajari
            self.PA = self.add_weight(
                shape=(self.num_vertices, self.num_vertices),
                initializer=tf.keras.initializers.RandomNormal(stddev=1e-4),
                trainable=True,
                name='PA'
            )

        if in_channels != self.out_channels:
            self.down_sample = models.Sequential([
                layers.Conv2D(self.out_channels, kernel_size=1, use_bias=False),
                layers.BatchNormalization()
            ])
        else:
            self.down_sample = lambda x: x

        super().build(input_shape)

    def call(self, x, A=None):
        if A is None:
            A = get_adjacency_matrix()

        residual = self.down_sample(x)

        x = self.conv(x)

        if self.adaptive:
            A_dynamic = A + self.PA
            x_t = tf.transpose(x, [0, 1, 3, 2]) # (N, T, C, V)
            out = tf.matmul(x_t, A_dynamic) # (N, T, C, W)
            x = tf.transpose(out, [0, 1, 3, 2]) # (N, T, W, C)
        else:
            x_t = tf.transpose(x, [0, 1, 3, 2])
            out = tf.matmul(x_t, A)
            x = tf.transpose(out, [0, 1, 3, 2])

        x = self.bn(x)
        return tf.nn.relu6(x + residual)

    def get_config(self):
        config = super().get_config()
        config.update({
            "out_channels": self.out_channels,
            "num_vertices": self.num_vertices,
            "adaptive": self.adaptive,
        })
        return config
    
# Temporal Attention Mechanism
@keras.utils.register_keras_serializable()
class TemporalAttention(layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        hidden_dim = input_shape[-1]
        self.dense1 = layers.Dense(hidden_dim // 2, activation='tanh')
        self.dense2 = layers.Dense(1)
        super().build(input_shape)

    def call(self, lstm_out):
        attn_scores = self.dense2(self.dense1(lstm_out))
        attn_weights = tf.nn.softmax(attn_scores, axis=1)
        context_vector = tf.reduce_sum(attn_weights * lstm_out, axis=1)
        return context_vector

    def get_config(self):
        config = super().get_config()
        return config
    
@keras.utils.register_keras_serializable()
class InputReshape(layers.Layer):
    def __init__(self, M=3, T=100, V=17, C=3, **kwargs):
        super().__init__(**kwargs)
        self.M = M
        self.T = T
        self.V = V
        self.C = C

    def call(self, inputs):
        x = tf.transpose(inputs, [0, 4, 2, 3, 1])
        x = tf.reshape(x, [-1, self.T, self.V, self.C])
        return x

    def get_config(self):
        config = super().get_config()
        config.update({"M": self.M, "T": self.T, "V": self.V, "C": self.C})
        return config

@keras.utils.register_keras_serializable()
class SpatialPooling(layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def call(self, x):
        return tf.reduce_mean(x, axis=2)

@keras.utils.register_keras_serializable()
class LatePooling(layers.Layer):
    def __init__(self, M=3, hidden_dim=512, **kwargs):
        super().__init__(**kwargs)
        self.M = M
        self.hidden_dim = hidden_dim

    def call(self, x):
        x = tf.reshape(x, [-1, self.M, self.hidden_dim])
        return tf.reduce_max(x, axis=1)

    def get_config(self):
        config = super().get_config()
        config.update({"M": self.M, "hidden_dim": self.hidden_dim})
        return config
    
def build_gcn_model(num_classes=5, batch_size=None, hidden_gcn=64, hidden_lstm=256, lstm_layers=1, dropout_rate=0.5, unroll=False):
    inputs = keras.Input(batch_shape=(batch_size, 3, 100, 17, 3), name="input_tensor")

    M = 3; T = 100; V = 17; C = 3
    x = InputReshape(M, T, V, C, name="early_reshape")(inputs)

    # --- SPATIAL GCN PROCESSING ---
    x = GraphConv(hidden_gcn, V, adaptive=True)(x, A_tensor)
    x = GraphConv(hidden_gcn * 2, V, adaptive=True)(x, A_tensor)
    x = GraphConv(hidden_gcn * 2, V, adaptive=True)(x, A_tensor)
    x = GraphConv(hidden_gcn * 4, V, adaptive=True)(x, A_tensor)
    x = GraphConv(hidden_gcn * 4, V, adaptive=True)(x, A_tensor)

    x = SpatialPooling(name="spatial_pooling")(x)

    # --- TEMPORAL CONVOLUTION (TCN) ---
    x = layers.Conv1D(hidden_gcn * 4, kernel_size=3, padding='same')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu6')(x)

    # --- LSTM PROCESSING ---
    for i in range(lstm_layers):
      x = layers.LSTM(hidden_lstm, return_sequences=True, unroll=unroll)(x)

    # --- TEMPORAL ATTENTION ---
    x = TemporalAttention()(x)
    x = LatePooling(M=M, hidden_dim=hidden_lstm, name="late_pooling")(x)

    # --- KLASIFIKASI AKHIR ---
    x = layers.Dense(hidden_lstm, activation='relu6')(x)
    x = layers.Dropout(dropout_rate)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="GCN_LSTM")
    return model