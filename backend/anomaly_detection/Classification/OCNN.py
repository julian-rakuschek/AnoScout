import math

import numpy as np
from bson import ObjectId
from pymongo.synchronous.database import Database

import backend.helper.database as database
from backend.helper.util import add_dbr_pca_to_segments


class OCNN:
    def __init__(self, BID: ObjectId, channel: str, j: int, k: int, n_prototypes: int, ratio_threshold: float = 1):
        self.db = database.get_db()
        self.segments = database.get_all_bucket_segments(self.db, BID, channel, 100)
        self.segments = add_dbr_pca_to_segments(BID, self.segments, True)
        self.j = j
        self.k = k

    def compute_jknn(self, segment_idx):
        input_segment = self.segments[segment_idx]
        primary_neighbors = []
        for idx, segment in enumerate(self.segments):
            if not segment["normal"]:
                continue
            neighbor = np.linalg.norm(input_segment["dbr"] - segment["dbr"])
            primary_neighbors.append((idx, neighbor))
        primary_neighbors.sort(key=lambda x: x[1], reverse=False)
        primary_neighbors = primary_neighbors[:self.j]
        if len(primary_neighbors) == 0:
            return [], 0

        all_neighbor_paths = []
        all_secondary_distances = []
        for primary_neighbor in primary_neighbors:
            secondary_neighbors = []
            for idx, segment in enumerate(self.segments):
                if not segment["normal"] or primary_neighbor[0] == idx:
                    continue
                dist = np.linalg.norm(self.segments[primary_neighbor[0]]["dbr"] - segment["dbr"])
                secondary_neighbors.append((idx, dist))
            secondary_neighbors.sort(key=lambda x: x[1], reverse=False)
            secondary_neighbors = secondary_neighbors[:self.k]
            for secondary_neighbor in secondary_neighbors:
                all_neighbor_paths.append([segment_idx, primary_neighbor[0], secondary_neighbor[0]])
                all_secondary_distances.append(secondary_neighbor[1])

        avg_j = np.mean([d[1] for d in primary_neighbors])
        avg_k = np.mean(all_secondary_distances)
        return all_neighbor_paths, avg_j / avg_k

    def compute_all_segments(self, TID=None):
        segments = []
        for idx, segment in enumerate(self.segments):
            if TID is not None and TID != segment["TID"]:
                continue
            if segment["normal"]:
                segment["ratio"] = 0
                segment["paths"] = []
            else:
                all_paths, ratio = self.compute_jknn(idx)
                segment["ratio"] = 0 if math.isnan(ratio) or np.isnan(ratio) else ratio
                segment["paths"] = all_paths
            segments.append(segment)
        return segments


def classify_bucket(db: Database, BID: ObjectId, channel, algorithm_config, algo_id: ObjectId):
    bucket = database.get_bucket(db, BID)
    ts_list = database.list_timeseries(db, BID)
    classifier = OCNN(BID, channel, **algorithm_config)
    computed_nn = classifier.compute_all_segments()
    positive_labels = []
    for segment in computed_nn:
        if segment["ratio"] > algorithm_config["ratio_threshold"]:
            positive_labels.append({
                "dateTrunc": segment.get("dateTrunc", None),
                "granularity": bucket["classification_granularity"],
                "algo": algo_id,
                "channel": channel,
                "TID": segment["TID"]
            })
    for ts in ts_list:
        db["anomalyClassifications"].delete_many({"algo": algo_id, "TID": ts["_id"], "channel": channel})
    if len(positive_labels) > 0:
        db["anomalyClassifications"].insert_many(positive_labels)
