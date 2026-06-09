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
        self.conv = layers.Conv2D(self.out_channels, kernel_size=(1, 1), use_bias=False)
        self.bn = layers.BatchNormalization()

        if self.adaptive:
            # Shape: (H, W, In_Channels, Out_Channels)
            self.PA = self.add_weight(
                shape=(1, 1, self.num_vertices, self.num_vertices),
                initializer=tf.keras.initializers.RandomNormal(stddev=1e-4),
                trainable=True,
                name='PA'
            )

        if in_channels != self.out_channels:
            self.down_sample = models.Sequential([
                layers.Conv2D(self.out_channels, kernel_size=(1, 1), use_bias=False),
                layers.BatchNormalization()
            ])
        else:
            self.down_sample = lambda x: x

        super().build(input_shape)

    def call(self, x):
        residual = self.down_sample(x)
        x = self.conv(x)

        A_kernel = tf.reshape(A_tensor, (1, 1, self.num_vertices, self.num_vertices))
        if self.adaptive:
            A_kernel = A_kernel + self.PA

        x_t = tf.transpose(x, [0, 1, 3, 2]) # (3, 100, C, 17)
        out = tf.nn.conv2d(x_t, A_kernel, strides=[1, 1, 1, 1], padding='SAME')
        x = tf.transpose(out, [0, 1, 3, 2]) # Back to (3, 100, 17, C)

        x = self.bn(x)
        return tf.nn.relu6(x + residual)

    def get_config(self):
        config = super().get_config()
        config.update({"out_channels": self.out_channels, "num_vertices": self.num_vertices, "adaptive": self.adaptive})
        return config
    
# Temporal Attention Mechanism
@keras.utils.register_keras_serializable()
class TCNBlock(layers.Layer):
    def __init__(self, filters, **kwargs):
        super().__init__(**kwargs)
        self.filters = filters
        self.res_conv = layers.Conv2D(self.filters, kernel_size=(1, 1), padding='same', use_bias=False)
        self.res_bn = layers.BatchNormalization()

        f1 = self.filters // 3
        f2 = self.filters // 3
        f3 = self.filters - f1 - f2

        self.b1_conv = layers.Conv2D(f1, kernel_size=(3, 1), padding='same', dilation_rate=(1, 1), use_bias=False)
        self.b1_bn = layers.BatchNormalization()

        self.b2_conv = layers.Conv2D(f2, kernel_size=(3, 1), padding='same', dilation_rate=(2, 1), use_bias=False)
        self.b2_bn = layers.BatchNormalization()

        self.b3_conv = layers.Conv2D(f3, kernel_size=(3, 1), padding='same', dilation_rate=(4, 1), use_bias=False)
        self.b3_bn = layers.BatchNormalization()

        self.concat = layers.Concatenate(axis=-1)
        self.activation_concat = layers.Activation('relu6')
        
        # Temporal Attention
        self.se_gap = layers.GlobalAveragePooling2D()
        self.se_squeeze = layers.Dense(max(1, self.filters // 8), activation='relu6')
        self.se_excite = layers.Dense(self.filters, activation='sigmoid')
        self.se_multiply = layers.Multiply()

        self.add = layers.Add()
        self.final_activation = layers.Activation('relu6')

    def call(self, x):
        residual = self.res_bn(self.res_conv(x))

        b1 = self.b1_bn(self.b1_conv(x))
        b2 = self.b2_bn(self.b2_conv(x))
        b3 = self.b3_bn(self.b3_conv(x))

        out = self.concat([b1, b2, b3])
        out = self.activation_concat(out)
        
        # Squeeze and Excitation
        se = self.se_gap(out)
        se = self.se_squeeze(se)
        se = self.se_excite(se)
        se = tf.expand_dims(tf.expand_dims(se, 1), 1) 
        out = self.se_multiply([out, se])

        out = self.add([out, residual])
        return self.final_activation(out)

    def compute_output_shape(self, input_shape):
        return (input_shape[0], input_shape[1], input_shape[2], self.filters)

    def get_config(self):
        config = super().get_config()
        config.update({"filters": self.filters})
        return config
    
@keras.utils.register_keras_serializable()
class EarlyReshape(layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def call(self, inputs):
        # inputs shape: (Batch, M=3, T=100, V=17, C=3)
        x = tf.transpose(inputs, [0, 4, 2, 3, 1])
        return tf.reshape(x, [-1, 100, 17, 3])

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
        config = super().get_config()
        config.update({"hidden_dim": self.hidden_dim})
        return config

@keras.utils.register_keras_serializable()
class LatePoolingTPU(layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def call(self, inputs):
        x = tf.expand_dims(inputs, axis=0)
        return tf.reduce_max(x, axis=1)

    def compute_output_shape(self, input_shape):
        return (1, input_shape[-1])
    
def build_gcn_model(num_classes=5, hidden_gcn=64, gcn_block_1=1, gcn_block_2=2, gcn_block_3=2, dropout_rate=0.5, for_tpu_export=False):
    M = 3; T = 100; V = 17; C = 3

    if for_tpu_export:
        inputs = keras.Input(batch_shape=(C, T, V, M), name="input_tensor")
        x = inputs
    else:
        inputs = keras.Input(shape=(C, T, V, M), name="input_tensor")
        x = EarlyReshape(name="early_reshape")(inputs)

    # --- SPATIAL GCN PROCESSING ---
    for i in range(gcn_block_1):
        x = GraphConv(hidden_gcn, V, adaptive=True)(x)
    
    for i in range(gcn_block_2):
        x = GraphConv(hidden_gcn * 2, V, adaptive=True)(x)
    
    for i in range(gcn_block_3):
        x = GraphConv(hidden_gcn * 4, V, adaptive=True)(x)

    x = layers.AveragePooling2D(pool_size=(1, 17))(x)

    # --- TEMPORAL CONVOLUTION (TCN) ---
    x = TCNBlock(hidden_gcn * 4)(x)
    x = layers.MaxPooling2D(pool_size=(2, 1))(x)

    x = TCNBlock(hidden_gcn * 8)(x)
    x = layers.MaxPooling2D(pool_size=(2, 1))(x)
    
    # Output shape: (Batch * M, hidden_gcn * 4)
    x = layers.GlobalAveragePooling2D(name="temporal_pooling")(x)

    # --- LATE POOLING ---
    if for_tpu_export:
        x = LatePoolingTPU(name="late_pooling_tpu")(x)
    else:
        x = LatePoolingTrain(hidden_dim=hidden_gcn * 8, name="late_pooling_train")(x)

    # --- KLASIFIKASI AKHIR ---
    x = layers.Dense(hidden_gcn * 8, activation='relu6')(x)
    x = layers.Dropout(dropout_rate)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="GCN_TCN_TPU")
    return model