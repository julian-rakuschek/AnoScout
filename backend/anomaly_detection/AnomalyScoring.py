import numpy as np
import pandas as pd
from aeon.anomaly_detection import MERLIN, STOMP, DWT_MLEAD, KMeansAD, LOF
from bson import ObjectId
from pymongo.synchronous.database import Database
from tslearn.preprocessing import TimeSeriesResampler
import backend.helper.database as database


def smooth_merlin(scores, window_size):
    new_scores = []
    for idx, s in enumerate(scores):
        subset = scores[max(0, idx - window_size // 2):idx + window_size // 2]
        if np.any(subset):
            new_scores.append(1)
        else:
            new_scores.append(0)
    return new_scores


class AnomalyScoring:
    def __init__(self, parameters: dict, method: str):
        self.method = method
        self.parameters = parameters

    def anomaly_detection(self, values: np.ndarray):
        if self.method == "MERLIN":
            detector = MERLIN(**self.parameters)
        elif self.method == "STOMP":
            detector = STOMP(**self.parameters)
        elif self.method == "DWT_MLEAD":
            detector = DWT_MLEAD(**self.parameters)
        elif self.method == "KMeansAD":
            detector = KMeansAD(**self.parameters)
        elif self.method == "LOF":
            detector = LOF(**self.parameters)
        else:
            raise Exception("Unknown algorithm")
        original_length = len(values)
        if self.method == "LOF":
            values = TimeSeriesResampler(1000).fit_transform(values).flatten()
        scores = detector.fit_predict(values)
        scores = np.array([float(s) for s in scores])
        if self.method == "MERLIN":
            scores = smooth_merlin(scores, 20)
        return TimeSeriesResampler(original_length).fit_transform(scores).flatten()


def score_timeseries(db: Database, TID: ObjectId, parameters, method, algo_id: ObjectId):
    algo = AnomalyScoring(parameters, method)
    ts = database.get_timeseries(db, TID)
    data_points = list(db["timeSeriesData"].find({"ids.TID": TID}))
    for channel in ts["channels"]:
        values = np.array([item["values"][channel] for item in data_points])
        scores = algo.anomaly_detection(values)
        scores_to_insert = [
            {
                "timestamp": data_points[index]["timestamp"],
                "value": s,
                "ids": {"BID": ts["BID"], "TID": TID, "AlgoID": algo_id},
                "channel": channel
            } for index, s in enumerate(scores)
        ]
        db["anomalyScores"].delete_many({"ids.AlgoID": algo_id, "ids.TID": TID})
        db["anomalyScores"].insert_many(scores_to_insert)


def example9():
    dataset = pd.read_csv('../../dataset/GutenTAG/frequency.csv').to_numpy().flatten()
    algo = AnomalyScoring(method="MERLIN", parameters={"min_length": 50, "max_length": 200})
    scores = algo.anomaly_detection(dataset)
    print(scores)


if __name__ == '__main__':
    example9()
    # example9()
