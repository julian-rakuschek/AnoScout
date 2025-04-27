import keras
import numpy as np
from bson import ObjectId
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import backend.helper.database as database
from keras.optimizers import AdamW
tf.config.set_visible_devices([], 'GPU')  # Disable GPU

class AutoEncoder:
    def __init__(self, BID: ObjectId, channel: str, threshold: float, jitter: int):
        self.db = database.get_db()
        self.segments = database.get_all_bucket_segments(self.db, BID, channel, 100)
        self.train_sequences = np.array([s["values"] for s in self.segments if s["normal"]])
        self.threshold = threshold
        self.jitter = jitter

    def add_jitter(self, data, noise_level=0.02):
        augmented_data = []
        for _ in range(self.jitter):
            noise = np.random.normal(0, noise_level, data.shape)
            augmented_data.append(data + noise)
        return np.concatenate(augmented_data, axis=0)

    def build_autoencoder(self, seq_length):
        input_layer = keras.Input(shape=(seq_length, 1))

        encoded = layers.LSTM(32, activation='relu', return_sequences=True)(input_layer)
        encoded = layers.LSTM(16, activation='relu', return_sequences=False)(encoded)
        encoded = layers.Dense(8, activation='tanh')(encoded)  # Bottleneck layer

        decoded = layers.RepeatVector(seq_length)(encoded)
        decoded = layers.LSTM(16, activation='relu', return_sequences=True)(decoded)
        decoded = layers.LSTM(32, activation='relu', return_sequences=True)(decoded)

        output_layer = layers.TimeDistributed(layers.Dense(1))(decoded)

        autoencoder = keras.Model(input_layer, output_layer)
        autoencoder.compile(
            optimizer=AdamW(learning_rate=0.001),
            loss=tf.keras.losses.Huber()
        )
        return autoencoder

    def train(self):
        train_augmented = self.add_jitter(self.train_sequences, noise_level=0.02)
        autoencoder = self.build_autoencoder(100)
        lr_schedule = keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.7, patience=10, min_lr=1e-5)
        autoencoder.fit(
            train_augmented, train_augmented,
            epochs=20, batch_size=8,
            validation_split=0.1,
            verbose=1, callbacks=[lr_schedule]
        )
        return autoencoder

    def classify(self, model):
        sequences = np.array([s["values"] for s in self.segments])
        sequences = np.expand_dims(sequences, axis=-1)  # Ensure proper shape
        reconstructed = model.predict(sequences, verbose=0)
        reconstructed = np.squeeze(reconstructed, axis=-1)  # Reconstructed time series for each day
        mean_error = np.mean(np.abs(sequences[:, :, 0] - reconstructed), axis=1)
        threshold = np.percentile(mean_error, self.threshold)  # Actual "anomaly score" for each data
        anomalies = mean_error > threshold  # Binary anomaly array for each day

        return anomalies, mean_error, reconstructed


if __name__ == '__main__':
    ae = AutoEncoder(ObjectId("67b821e7d8ca4c72a49b5850"), "co2", 95, 10)
    ae_model = ae.train()
    anomalies, mean_error, reconstructed = ae.classify(ae_model)
    print(anomalies)
