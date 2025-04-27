import math
from io import StringIO, BytesIO

import numpy as np
from bson import ObjectId
from matplotlib import pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.pyplot import get_cmap
from pymongo.synchronous.database import Database
from PIL import Image

import backend.helper.database as database
from backend.helper.util import add_dbr_pca_to_segments
from sklearn.neighbors import KernelDensity
from scipy.ndimage import label


class KDE:
    def __init__(self, BID: ObjectId, channel: str, bandwidth: float, level: float = 1):
        self.db = database.get_db()
        self.level = level
        self.segments = database.get_all_bucket_segments(self.db, BID, channel, 100)
        self.segments = add_dbr_pca_to_segments(BID, self.segments, True)
        self.points = np.array([[s["x"], s["y"]] for s in self.segments])
        self.kde = KernelDensity(kernel='gaussian', bandwidth=bandwidth)
        self.kde.fit(self.points)

        self.bins = 100
        self.padding = 0.2
        self.density_map = self.calculate_density_map(self.bins, self.padding)

    def calculate_density_map(self, bins, padding):
        # Create a dictionary to store all parameters and intermediate results
        density_map = {
            'x_min': np.min(self.points[:, 0]),
            'x_max': np.max(self.points[:, 0]),
            'y_min': np.min(self.points[:, 1]),
            'y_max': np.max(self.points[:, 1])
        }

        # Calculate spans
        density_map['x_span'] = abs(density_map['x_max'] - density_map['x_min'])
        density_map['y_span'] = abs(density_map['y_max'] - density_map['y_min'])

        # Apply padding
        density_map['x_min'] -= density_map['x_span'] * padding
        density_map['x_max'] += density_map['x_span'] * padding
        density_map['y_min'] -= density_map['y_span'] * padding
        density_map['y_max'] += density_map['y_span'] * padding

        # Create grid and sample points
        density_map['xx'], density_map['yy'] = np.mgrid[
                                               density_map['x_min']:density_map['x_max']:complex(bins),
                                               density_map['y_min']:density_map['y_max']:complex(bins)
                                               ]
        density_map['xy_sample'] = np.vstack([density_map['xx'].ravel(), density_map['yy'].ravel()]).T

        # Calculate density values
        density_map['z'] = np.exp(self.kde.score_samples(density_map['xy_sample']))
        density_map['zz'] = np.reshape(density_map['z'], density_map['xx'].shape)

        # Normalize values
        density_map['zz_normalized'] = 1 - (
                (np.max(density_map['zz']) - density_map['zz']) /
                (np.max(density_map['zz']) - np.min(density_map['zz']))
        )

        # Store original values
        density_map['zz_copy'] = np.copy(density_map['zz_normalized'])

        # Apply threshold
        density_map['zz_binary'] = np.copy(density_map['zz_normalized'])
        density_map['zz_binary'][density_map['zz_binary'] >= self.level] = 1
        density_map['zz_binary'][density_map['zz_binary'] < self.level] = 0

        # Label connected components
        density_map['labeled_array'], _ = label(density_map['zz_binary'])

        return density_map

    def get_grid_scoring(self, TID=None):
        labeled_array = self.density_map["labeled_array"]
        normal_components = []
        for segment in self.segments:
            segment_x_index = np.argmin(abs(self.density_map["xx"][:, 0] - segment["x"]))
            segment_y_index = np.argmin(abs(self.density_map["yy"][0] - segment["y"]))
            segment["component"] = int(labeled_array[segment_x_index, segment_y_index])
            if segment["component"] > 0 and segment["normal"]:
                normal_components.append(segment["component"])
        normal_components = list(set(normal_components))
        segments = [s for s in self.segments if TID is None or TID == s["TID"]]
        for segment in segments:
            segment["class"] = 0 if segment["component"] in normal_components else 1

        result = {
            "xx": self.density_map["xx"],
            "yy": self.density_map["yy"],
            "zz": self.density_map["zz_copy"],
            "components": labeled_array,
            "normal_components": normal_components,
            "segments": segments
        }
        return result

    def vis_2d_grid(self):
        res = self.get_grid_scoring()
        points = np.array([[s["x"], s["y"]] for s in res["segments"]])
        colors = []
        for s in res["segments"]:
            if s["normal"]:
                colors.append("green")
            elif s["class"] == 1:
                colors.append("white")
            elif s["class"] == 0:
                colors.append("red")
        fix, ax = plt.subplots(figsize=(20, 20))
        ax.pcolormesh(res["xx"], res["yy"], res["zz"])
        ax.scatter(points[:, 0], points[:, 1], s=2, facecolor=colors)
        plt.savefig("heatmap.png", dpi=300)

        plt.clf()
        fix, ax = plt.subplots(figsize=(20, 20))
        ax.pcolormesh(res["xx"], res["yy"], res["components"])
        ax.scatter(points[:, 0], points[:, 1], s=2, facecolor=colors)
        plt.savefig("heatmap2.png", dpi=300)

    def vis_2d_grid_2(self, img_width=700, img_height=700, save_to_file=False):
        res = self.get_grid_scoring()
        cell_pixels_x = img_width // self.bins
        cell_pixels_y = img_height // self.bins
        img = Image.new('RGB', (img_width, img_height))

        anomlous_cmap = LinearSegmentedColormap.from_list("anomlous_cmap", ["white", "#e91e63"])
        normal_cmap = LinearSegmentedColormap.from_list("normal_cmap", ["white", "#3f51b5"])
        neutral_cmap = LinearSegmentedColormap.from_list("neutral_cmap", ["white", "#424242"])

        for y in range(self.bins):
            for x in range(self.bins):
                if res["components"][x][y] > 0:
                    if res["components"][x][y] in res["normal_components"]:
                        color = normal_cmap(res["zz"][x][y])
                    else:
                        color = anomlous_cmap(res["zz"][x][y])
                else:
                    color = neutral_cmap(res["zz"][x][y])
                rgb = tuple(int(255 * c) for c in color[:3])
                for dy in range(cell_pixels_y):
                    for dx in range(cell_pixels_x):
                        y_inverted = img_height - (y * cell_pixels_y + dy) - 1
                        try:
                            img.putpixel((x * cell_pixels_x + dx, y_inverted), rgb)
                        except IndexError:
                            pass
        if save_to_file:
            img.save("heatmap.png")
        img_io = BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)
        return img_io


def classify_bucket(db: Database, BID: ObjectId, channel, algorithm_config, algo_id: ObjectId):
    bucket = database.get_bucket(db, BID)
    ts_list = database.list_timeseries(db, BID)
    classifier = KDE(BID, channel, **algorithm_config)
    for ts in ts_list:
        positive_labels = []
        res = classifier.get_grid_scoring(TID=ts["_id"])
        for segment in res["segments"]:
            if segment["class"] == 1:
                positive_labels.append({
                    "dateTrunc": segment.get("dateTrunc", None),
                    "granularity": bucket["classification_granularity"],
                    "algo": algo_id,
                    "channel": channel,
                    "TID": ts["_id"]
                })
        db["anomalyClassifications"].delete_many({"algo": algo_id, "TID": ts["_id"], "channel": channel})
        if len(positive_labels) > 0:
            db["anomalyClassifications"].insert_many(positive_labels)


if __name__ == '__main__':
    db = database.get_db()
    # classify_bucket(db, ObjectId("68078e56ed3882b302ae3b2a"), "value-0", {"bandwidth": 2, "level": 0.05}, ObjectId("68079235c066a51d3679dc99"))

    kde = KDE(ObjectId("68078e56ed3882b302ae3b2a"), "value-0", 7, 0.33)
    kde.vis_2d_grid_2(save_to_file=True, img_width=1416, img_height=700)
