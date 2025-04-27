import datetime
import time
from pprint import pprint

import matplotlib.pyplot as plt
import numpy as np
from bson import ObjectId
from pymongo.database import Database
from scipy.signal import savgol_filter
from tslearn.piecewise import PiecewiseAggregateApproximation
from tslearn.preprocessing import TimeSeriesResampler

import backend.helper.database as database


class QueryTimeseries:
    def __init__(self, db: Database, TID: ObjectId, channel: str, BID: ObjectId = None, from_: datetime.datetime = None, to_: datetime.datetime = None, n_segments: int | None = 1000, only_ts: bool = False):
        self.data_points = []
        self.db = db
        self.TID = TID
        self.BID = BID if BID is not None else database.get_timeseries(db, TID)["BID"]
        self.from_ = from_
        self.to_ = to_
        self.n_segments = n_segments
        self.channel = channel
        self.only_ts = only_ts

        self.bucket = database.get_bucket(db, self.BID)
        self.smoothing_window = self.bucket["smoothing_window"]
        self.threshold = self.bucket["threshold"]

        algorithms = database.get_bucket_algorithms(db, self.BID)
        self.min_max = database.get_baseline_min_max(db, self.BID)
        self.available_scores = [a["_id"]["algorithm"] for a in database.get_availble_score_algos(db, self.TID)]
        self.algorithms = []

        for scoring in self.min_max:
            for algo in algorithms:
                if scoring["_id"]["algorithm"] == algo["_id"] and scoring["_id"]["algorithm"] in self.available_scores:
                    self.algorithms.append(algo)

    def get_db_filter(self, collection: str):
        if collection not in ["timeSeriesData", "anomalyScores"]:
            raise Exception("unsupported collection")

        db_filter = {"ids.TID": self.TID}
        if collection == "anomalyScores":
            db_filter["channel"] = self.channel
        if self.from_ is not None or self.to_ is not None:
            db_filter["timestamp"] = {}
            if self.from_ is not None:
                db_filter["timestamp"]["$gte"] = self.from_
            if self.to_ is not None:
                db_filter["timestamp"]["$lte"] = self.to_
        select = {"_id": 0, "timestamp": 1}
        if collection == "timeSeriesData":
            select[f"values.{self.channel}"] = 1
        else:
            select["value"] = 1

        return db_filter, select

    def time_series_query(self):
        db_filter, select = self.get_db_filter("timeSeriesData")
        ts = list(self.db["timeSeriesData"].find(db_filter, select))
        timestamps = [t["timestamp"] for t in ts]
        values = [t["values"][self.channel] for t in ts]
        return timestamps, np.array(values)

    def anomaly_score_query(self):
        db_filter, select = self.get_db_filter("anomalyScores")
        scores = []
        for algo in self.algorithms:
            db_filter_algo = {**db_filter, "ids.AlgoID": algo["_id"]}
            algo_scores = list(self.db["anomalyScores"].find(db_filter_algo, select))
            scores.append([s["value"] for s in algo_scores])
        return np.array(scores)

    def reduce(self, values: np.array) -> (np.array):
        n = values.shape[0] if values.ndim == 1 else values.shape[1]
        if self.n_segments is not None and 0 <= self.n_segments < n:
            # paa = PiecewiseAggregateApproximation(n_segments=self.n_segments)
            paa = TimeSeriesResampler(self.n_segments)
            if values.ndim == 1:
                values = paa.fit_transform(values.reshape(1, -1)).flatten()
            else:
                values = paa.fit_transform(values)
                values = np.squeeze(values, axis=-1)
        return values

    def normalize(self, scores: np.array) -> np.array:
        scores_norm = []
        for index, algo_score in enumerate(scores):
            scores_norm.append((algo_score - self.min_max[index]["minScore"]) / (self.min_max[index]["maxScore"] - self.min_max[index]["minScore"]))
        return np.array(scores_norm)

    def reduce_timestamps(self, timestamps):
        if self.n_segments is not None and 0 <= self.n_segments < len(timestamps):
            step_size = len(timestamps) // self.n_segments
            timestamps = [
                timestamps[window * step_size]
                for window in range(self.n_segments)
            ]
        return timestamps

    def ensemble(self, scores):
        weights = np.array([algo["weight"] for algo in self.algorithms])
        ensembles = np.average(scores, axis=0, weights=weights if np.sum(weights) > 0 else None)
        return ensembles

    def post_process_ensemble(self, ensemble: np.array):
        ensemble_post = np.copy(ensemble)
        if self.n_segments is None or (self.n_segments - 2) > self.smoothing_window > 5:
            try:
                ensemble_post = savgol_filter(ensemble_post, self.smoothing_window, 3)
            except:
                pass
        return ensemble_post

    def exec(self):
        timestamps, ts_data = self.time_series_query()
        ts_data = self.reduce(ts_data)
        timestamps = self.reduce_timestamps(timestamps)

        if len(self.algorithms) == 0 or self.only_ts:
            result = []
            for index in range(len(timestamps)):
                result.append({
                    "timestamp": timestamps[index],
                    "value": ts_data[index],
                })
            return result

        scores = self.anomaly_score_query()
        scores = self.reduce(scores)
        scores_norm = self.normalize(scores)
        en = self.ensemble(scores_norm)
        en2 = self.post_process_ensemble(en)
        result = []
        for index in range(len(timestamps)):
            algo_scores = {str(a["_id"]): scores_norm[i][index] for i, a in enumerate(self.algorithms)}
            result.append({
                "timestamp": timestamps[index],
                "value": ts_data[index],
                "scores": algo_scores,
                "ensemble": en[index],
                "ensemble_processed": en2[index]
            })
        return result


if __name__ == '__main__':
    db = database.get_db()
    TID = ObjectId("67925c8cfc8d0657099ad5fc")
    query = QueryTimeseries(db, TID, "value-0", n_segments=30).exec()
    print(query)
