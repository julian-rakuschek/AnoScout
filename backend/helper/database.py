import copy
import datetime
import json
import math
import os
import shutil
from io import StringIO
from pathlib import Path
from pprint import pprint
from typing import List
from dtaidistance import dtw_barycenter
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pymongo
import redis
from bson import json_util
from bson.objectid import ObjectId
from dateutil import parser
from fastdtw import fastdtw
from pymongo.database import Database
from scipy.signal import savgol_filter
from sklearn.preprocessing import MinMaxScaler
from tslearn.barycenters import euclidean_barycenter
from tslearn.piecewise import PiecewiseAggregateApproximation
from tslearn.preprocessing import TimeSeriesResampler

import backend.helper.caching as caching
import backend.helper.clustering as clustering
from backend.helper.config import get_config
from backend.helper.query import QueryTimeseries
from backend.helper.util import get_ts_labels, truncate_datetime_to_iso, iso_to_date_range

conf = get_config()
CACHE_BASELINE_MIN_MAX = conf["cache"]["keys"]["BASELINE_MIN_MAX"]
r = redis.Redis(host=conf["scheduler"]["redis"]["host"], port=conf["scheduler"]["redis"]["port"], db=1)


def serialize_mongodb(output):
    temp = json.dumps(output, default=json_util.default)
    return json.loads(temp)


def get_db() -> Database:
    conf = get_config()
    url = conf["mongo"]["url"]
    if os.environ.get('DOCKER', "False") == 'True':
        url = "mongodb://anoscout_mongodb:27017/"
    conn = pymongo.MongoClient(url)
    db: Database = conn[conf["mongo"]["db"]]
    return db


def init_db(db: Database):
    db.create_collection('timeSeriesData',
                         timeseries={'timeField': 'timestamp', 'metaField': 'ids', 'granularity': "seconds"})
    db["timeSeriesData"].create_index({"ids.TID": 1})
    db["timeSeriesData"].create_index({"ids.BID": 1})
    db["timeSeriesData"].create_index({"timestamp": 1})
    db.create_collection('anomalyScores',
                         timeseries={'timeField': 'timestamp', 'metaField': 'ids', 'granularity': "seconds"})
    db["anomalyScores"].create_index({"ids.TID": 1})
    db["anomalyScores"].create_index({"ids.BID": 1})
    db["anomalyScores"].create_index({"ids.AlgoID": 1})
    db["anomalyScores"].create_index({"timestamp": 1})
    db.create_collection('buckets')
    db.create_collection('timeSeries')
    db.create_collection('anomalies')
    db.create_collection('algorithms')
    db.create_collection('anomalyClassifications')


def verify_id(db: Database, id_to_check: str, collection: str):
    if not ObjectId.is_valid(id_to_check):
        return False
    if not db[collection].find_one({"_id": ObjectId(id_to_check)}):
        return False
    return True


# ----------------------------------------------
#              Bucket Management
# ----------------------------------------------

def create_bucket(db: Database, name: str, type: str, class_gran: str):
    conf = get_config()
    bucket = db["buckets"].insert_one(
        {
            "name": name,
            "type": type,
            "classification_granularity": "full" if type == "scoring" else class_gran,
            "classification_ensemble": "majority",
            **conf["anomaly_scores"],
        }
    )
    add_default_algorithms(db, bucket.inserted_id, type)
    return bucket.inserted_id


def list_buckets(db: Database):
    return list(db["buckets"].find())


def get_bucket(db: Database, BID: ObjectId):
    return db["buckets"].find_one({"_id": BID})


def rename_bucket(db: Database, BID: ObjectId, name: str):
    db["buckets"].update_one({"_id": BID}, {"$set": {"name": name}})


def set_threshold(db: Database, BID: ObjectId, threshold: float):
    db["buckets"].update_one({"_id": BID}, {"$set": {"threshold": threshold}})


def set_smoothing_window(db: Database, BID: ObjectId, smoothing_window: int):
    db["buckets"].update_one({"_id": BID}, {"$set": {"smoothing_window": smoothing_window}})


def set_classification_ensemble(db: Database, BID: ObjectId, ensemble_method: str):
    db["buckets"].update_one({"_id": BID}, {"$set": {"classification_ensemble": ensemble_method}})


def delete_bucket(db: Database, BID: ObjectId):
    all_ts_ids = db["timeSeries"].find({"BID": BID})
    for ts in all_ts_ids:
        db["timeSeriesData"].delete_many({"ids.TID": ts["_id"]})
        db["anomalies"].delete_many({"TID": ts["_id"]})
    db["timeSeries"].delete_many({"BID": BID})
    db["alerts"].delete_many({"BID": BID})
    db["buckets"].delete_one({"_id": BID})
    dirpath = Path(os.path.join(Path(__file__).parents[1], "anomaly_detection", "models", str(BID)))
    if dirpath.exists() and dirpath.is_dir():
        shutil.rmtree(dirpath)
    caching.invalidate_caches(str(BID))


def bucket_channels(db: Database, BID: ObjectId):
    ts_list = list_timeseries(db, BID)
    channel_list = []
    for ts in ts_list:
        channel_list.extend(get_timeseries_channels(db, ts["_id"]))
    return list(set(channel_list))


def bucket_minmax(db: Database, BID: ObjectId, channel: str):
    timeseries = get_all_bucket_ts(db, BID, channel)
    values = []
    for ts in timeseries:
        values.extend(ts["values"])
    percentile_2_5 = np.percentile(values, 2.5)
    percentile_97_5 = np.percentile(values, 97.5)
    filtered_values = [v for v in values if percentile_2_5 <= v <= percentile_97_5]
    min_value = min(filtered_values)
    max_value = max(filtered_values)

    hist, bin_edges = np.histogram(filtered_values, bins=50, density=True)
    bin_width = bin_edges[1] - bin_edges[0]
    hist = hist * bin_width
    histogram = []
    for i in range(len(hist)):
        histogram.append({
            "from": float(bin_edges[i]),
            "to": float(bin_edges[i + 1]),
            "amount": float(hist[i])
        })
    return min_value, max_value, histogram


# ----------------------------------------------
#              Algorithm Management
# ----------------------------------------------

def add_default_algorithms(db: Database, BID: ObjectId, algo_type: str = "scoring"):
    algorithms = [algo for algo in conf["algorithms"] if conf["algorithms"][algo]["type"] == algo_type]
    for algorithm in algorithms:
        algo = {
            **conf["algorithms"][algorithm],
            "BID": BID,
            "algorithm": algorithm
        }
        db["algorithms"].insert_one(algo)


def add_algorithm(db: Database, BID: ObjectId, algorithm: str, name: str):
    return db["algorithms"].insert_one(
        {**conf["algorithms"][algorithm], "BID": BID, "name": name, "algorithm": algorithm}).inserted_id


def get_bucket_algorithms(db: Database, BID: ObjectId):
    return list(db["algorithms"].find({"BID": BID}))


def update_algorithm(db: Database, AlgoID: ObjectId, new_conf):
    db["algorithms"].update_one({"_id": AlgoID}, {"$set": new_conf})


def delete_algorithm(db: Database, AlgoID: ObjectId):
    db["algorithms"].delete_one({"_id": AlgoID})
    db["anomalyScores"].delete_many({"ids.AlgoID": AlgoID})
    db["anomalyClassifications"].delete_many({"algo": AlgoID})


# ----------------------------------------------
#              TS Management
# ----------------------------------------------

def list_timeseries(db: Database, BID: ObjectId):
    return list(db["timeSeries"].find({"BID": BID}))


def get_timeseries(db: Database, TID: ObjectId):
    return db["timeSeries"].find_one({"_id": TID})


def get_timeseries_channels(db: Database, TID: ObjectId):
    ts_point = db["timeSeriesData"].find_one({"ids.TID": TID})
    return list(ts_point["values"].keys())


def create_timeseries_entry(db: Database, BID: ObjectId, name: str, channels: list):
    result = db["timeSeries"].insert_one(
        {"name": name, "BID": BID, "channels": channels}
    )
    return result.inserted_id


def delete_timeseries(db: Database, TID: ObjectId):
    ts = db["timeSeries"].find_one({"_id": TID})
    caching.invalidate_caches(str(ts["BID"]))
    db["timeSeries"].delete_one({"_id": TID})
    db["timeSeriesData"].delete_many({"ids.TID": TID})
    db["anomalyScores"].delete_many({"ids.TID": TID})
    anomalies = db["anomalies"].find({"TID": TID})
    for anomaly in anomalies:
        db["alerts"].delete_many({"AID_alert": anomaly["_id"]})
        db["alerts"].delete_many({"AID_bookmark": anomaly["_id"]})
    db["anomalies"].delete_many({"TID": TID})


def rename_timeseries(db: Database, TID: ObjectId, name: str):
    db["timeSeries"].update_one({"_id": TID}, {"$set": {"name": name}})


def parse_csv(csv_string: str):
    header = csv_string.split("\n")[0]
    delimiter = ","
    if ";" in header:
        delimiter = ";"
    if "\t" in header:
        delimiter = "\t"
    df = pd.read_csv(StringIO(csv_string), sep=str(delimiter))
    json_items = json.loads(df.to_json(orient="records"))
    return json_items, [c for c in df.columns if c != "timestamp"]


def import_timeseries(db: Database, json_items: list, TID: ObjectId, BID: ObjectId):
    dt = datetime.datetime.now()
    def parse_timestamp(item):
        if "timestamp" in item:
            timestamp_value = item["timestamp"]
            try:
                timestamp = datetime.datetime.fromisoformat(timestamp_value)
            except Exception:
                try:
                    timestamp = datetime.datetime.fromtimestamp(float(timestamp_value))
                except Exception:
                    timestamp = copy.deepcopy(dt)
        else:
            timestamp = copy.deepcopy(dt)
        return timestamp

    time_series = []
    for item in json_items:
        timestamp = parse_timestamp(item)
        temp = {
            "timestamp": timestamp,
            "values": {key: float(value) for key, value in item.items() if key != "timestamp" and key != "is_anomaly"},
            "ids": {"BID": BID, "TID": TID}
        }
        if "is_anomaly" in item:
            temp["ground_truth"] = item["is_anomaly"]
        time_series.append(temp)
        dt += datetime.timedelta(seconds=1)
    time_series.sort(key=lambda s: s["timestamp"])
    db["timeSeriesData"].insert_many(time_series)


def calculate_zoom_level(db: Database, TID: ObjectId, from_date: datetime.datetime, to_date: datetime.datetime):
    first = db["timeSeriesData"].find_one({'ids.TID': TID}, sort=[('_id', pymongo.DESCENDING)])
    last = db["timeSeriesData"].find_one({'ids.TID': TID}, sort=[('_id', pymongo.ASCENDING)])
    if from_date is None:
        from_date = first["timestamp"]
    if to_date is None:
        to_date = last["timestamp"]
    total_timespan = abs((first["timestamp"] - last["timestamp"]).total_seconds())
    window_timestamp = abs((from_date - to_date).total_seconds())
    return round(1 - window_timestamp / total_timespan, 2)


def get_baseline_min_max(db: Database, BID: ObjectId):
    pipeline = [
        {
            "$match": {
                "ids.BID": BID
            }
        },
        {
            "$group": {
                "_id": {
                    "channel": "$channel",
                    "algorithm": "$ids.AlgoID"
                },
                "minScore": {"$min": "$value"},
                "maxScore": {"$max": "$value"}
            }
        }
    ]
    aggregated_min_max = list(db["anomalyScores"].aggregate(pipeline))
    return aggregated_min_max


def get_availble_score_algos(db: Database, TID: ObjectId):
    pipeline = [
        {
            "$match": {
                "ids.TID": TID
            }
        },
        {
            "$group": {
                "_id": {
                    "algorithm": "$ids.AlgoID"
                },
            }
        }
    ]
    aggregated_min_max = list(db["anomalyScores"].aggregate(pipeline))
    return aggregated_min_max


def query_timeseries(db: Database, TID: ObjectId, channel: str, from_: datetime.datetime = None,
                     to_: datetime.datetime = None, n_segments: int | None = None, only_ts: bool = False):
    return QueryTimeseries(db, TID=TID, from_=from_, to_=to_, n_segments=n_segments, channel=channel,
                           only_ts=only_ts).exec()


def query_ts_list(db: Database, ts_list: List[str], channel: str, n_segments=None):
    if len(ts_list) == 0:
        return {}
    ts_list_converted = [ObjectId(id_) for id_ in ts_list]
    pipeline = [
        {
            "$match": {
                "ids.TID": {"$in": ts_list_converted},
            }
        },
        {
            "$group": {
                "_id": {
                    "TID": "$ids.TID"
                },
                "values": {"$push": f"$values.{channel}"},
            }
        },
    ]
    timeseriesdict = {}
    all_values = list(db["timeSeriesData"].aggregate(pipeline))
    all_values = sorted(all_values, key=lambda s: str(s["_id"]["TID"]))
    all_values_np = []
    all_values_reduced = []
    avg_length = math.ceil(np.mean([len(ts["values"]) for ts in all_values]))
    if avg_length < n_segments:
        n_segments = avg_length
    for ts in all_values:
        if len(ts["values"]) < 3:
            continue
        values = TimeSeriesResampler(n_segments).fit_transform(np.array(ts["values"])).flatten()
        values_reduced = TimeSeriesResampler(100).fit_transform(np.array(ts["values"])).flatten()
        timeseriesdict[str(ts["_id"]["TID"])] = values.tolist()
        all_values_np.append(values)
        all_values_reduced.append(values_reduced)
    if len(all_values_np) == 0:
        return {"barycenter_values": []}
    if len(ts_list) > 1:
        all_values_reduced = np.array(all_values_reduced)
        dtw_bary = dtw_barycenter.dba(all_values_reduced, None)
        dtw_bary = TimeSeriesResampler(n_segments).fit_transform(dtw_bary).flatten()
        timeseriesdict["barycenter_values"] = dtw_bary.tolist()
    else:
        timeseriesdict["barycenter_values"] = all_values_np[0].tolist()
    return timeseriesdict


def query_ts_list_classifications(db: Database, ts_list: List[str], channel: str):
    algo_classifications = {}
    total_segments = 0
    bucket = get_bucket(db, get_timeseries(db, ObjectId(ts_list[0]))["BID"])

    for ts in ts_list:
        if bucket["classification_granularity"] == "full":
            total_segments += 1
        else:
            segments = get_ts_segments(db, ObjectId(ts), channel, bucket["classification_granularity"])
            total_segments += len(segments)
        for classification in get_classifications(db, ObjectId(ts), channel):
            algo_id = str(classification["algo"])
            if algo_id not in algo_classifications:
                algo_classifications[algo_id] = 0
            algo_classifications[algo_id] += 1
    for algo in algo_classifications:
        algo_classifications[algo] /= total_segments
    res = [{"algo": key, "ratio": value} for key, value in algo_classifications.items()]
    return res


def query_ts_list_anomaly_scores(db: Database, ts_list: List[str], channel: str, n_segments=100,
                                 return_aggregated=True):
    ts_list_converted = [ObjectId(id_) for id_ in ts_list]
    bucket_id = get_timeseries(db, ts_list_converted[0])["BID"]
    bucket = get_bucket(db, bucket_id)
    baseline = get_baseline_min_max(db, bucket_id)
    baseline_dict = {}
    for algo in baseline:
        if algo['_id']["channel"] != channel:
            continue
        baseline_dict[algo['_id']["algorithm"]] = {
            "min": algo["minScore"],
            "max": algo["maxScore"]
        }
    pipeline = [
        {
            "$match": {
                "ids.TID": {"$in": ts_list_converted},
                "channel": channel
            }
        },
        {
            "$group": {
                "_id": {
                    "AlgoID": "$ids.AlgoID",
                    "TID": "$ids.TID"
                },
                "values": {"$push": f"$value"},
            }
        },
    ]
    all_scores = list(db["anomalyScores"].aggregate(pipeline))
    if len(all_scores) == 0:
        return [], []
    scores_per_algo = {}
    score_indicator = {}
    for score in all_scores:
        index = score["_id"]["AlgoID"]
        if index not in score_indicator:
            score_indicator[index] = 0
        values = np.array(score["values"])
        if n_segments is not None and n_segments > 2:
            values = TimeSeriesResampler(n_segments).fit_transform(values).flatten()
        if index not in scores_per_algo:
            scores_per_algo[index] = []
        score_normalized = (values - baseline_dict[index]["min"]) / (baseline_dict[index]["max"] - baseline_dict[index]["min"])
        if np.any([int(s > bucket["threshold"]) for s in score_normalized]):
            score_indicator[index] += 1
        scores_per_algo[index].append(score_normalized)

    aggregated_algo_scores = []
    algo_ratios = []
    for algo, scores in scores_per_algo.items():
        ensemble_score = np.average(scores, axis=0)
        aggregated_algo_scores.append(ensemble_score)
        algo_ratios.append({"algo": str(algo), "score_sum": score_indicator[algo] / len(ts_list)})
    algo_ratios.sort(key=lambda x: x["algo"], reverse=False)
    aggregated_algo_scores = np.array(aggregated_algo_scores)
    return np.max(aggregated_algo_scores, axis=0).tolist() if return_aggregated else aggregated_algo_scores.tolist(), algo_ratios


def get_score_distribution(db: Database, BID: ObjectId, channel: str):
    ts = list_timeseries(db, BID)
    ts = [str(ts["_id"]) for ts in ts]
    scores, ratios = query_ts_list_anomaly_scores(db, ts, channel, 1000, False)
    scores = np.array(scores).flatten()
    hist, bin_edges = np.histogram(scores, bins=100, density=True, range=(0, 1))
    bin_width = bin_edges[1] - bin_edges[0]
    hist = hist * bin_width
    histogram = []
    for i in range(len(hist)):
        histogram.append({
            "from": float(bin_edges[i]),
            "to": float(bin_edges[i + 1]),
            "amount": float(hist[i]) if not np.isnan(hist[i]) else 0,
        })
    return histogram


def get_ts_segments(db: Database, TID: ObjectId, channel: str, unit: str):
    if unit == "full":
        ts = list(db["timeSeriesData"].find({"ids.TID": TID}))
        times = [t["timestamp"] for t in ts]
        values = [t["values"][channel] for t in ts]
        return [{"times": times, "values": values}]
    pipeline = [
        {
            "$match": {
                "ids.TID": TID
            }
        },
        {
            "$addFields": {
                "hourBucket": {"$dateTrunc": {"date": "$timestamp", "unit": unit}}
            }
        },
        {
            "$group": {
                "_id": "$hourBucket",
                "times": {"$push": "$timestamp"},
                "values": {"$push": f"$values.{channel}"}
            }
        },
        {
            "$sort": {"_id": 1}
        }
    ]
    aggregated = list(db["timeSeriesData"].aggregate(pipeline))
    return aggregated


def get_all_bucket_segments(db, BID, channel, resample_to_same_length=100):
    ts_list = list_timeseries(db, BID)
    bucket = get_bucket(db, BID)
    segments = []

    for ts in ts_list:
        ts_nominals = get_nominals(db, ts["_id"], False, channel)
        aggregated_ts = get_ts_segments(db, ts["_id"], channel, bucket["classification_granularity"])
        for segment in aggregated_ts:
            if len(np.array(segment["values"])) < 10:
                continue
            values = np.array(segment["values"])
            if resample_to_same_length is not None:
                values = TimeSeriesResampler(resample_to_same_length).fit_transform(values).flatten()
            is_normal = False
            if bucket["classification_granularity"] == "full":
                is_normal = len(ts_nominals) > 0
            else:
                for nominal in ts_nominals:
                    iso_date = truncate_datetime_to_iso(segment["times"][0], bucket["classification_granularity"])
                    if iso_date == nominal["date"]:
                        is_normal = True
            segments.append({
                "values": values,
                "normal": is_normal,
                "TID": ts["_id"],
                "channel": channel,
                "start": segment["times"][0],
                "end": segment["times"][-1],
                "dateTrunc": segment.get("_id", None),
            })
    return segments


def get_all_bucket_ts(db, BID, channel):
    pipeline = [
        {
            "$match": {
                "ids.BID": BID
            }
        },
        {
            "$group": {
                "_id": "$ids.TID",
                "values": {"$push": f"$values.{channel}"}
            }
        },
        {
            "$lookup": {
                "from": "timeSeries",
                "localField": "_id",
                "foreignField": "_id",
                "as": "timeseries_info"
            }
        },
        {
            "$addFields": {
                "name": {"$arrayElemAt": ["$timeseries_info.name", 0]}
            }
        },
        {
            "$sort": {"_id": 1}
        }
    ]
    aggregated = list(db["timeSeriesData"].aggregate(pipeline))
    return aggregated


def get_classifications_per_segment(db: Database, TID: ObjectId, channel: str):
    ts = get_timeseries(db, TID)
    bucket = get_bucket(db, ts["BID"])
    if bucket["classification_granularity"] == "full":
        ts = list(db["timeSeriesData"].find({"ids.TID": TID}))
        algos = list(db["anomalyClassifications"].find({"TID": TID}))
        res = {
            "algos": algos,
            "start": ts[0]["timestamp"],
            "end": ts[-1]["timestamp"],
            "length": len(ts),
        }
        return [res]
    pipeline = [
        {
            "$match": {
                "ids.TID": TID
            }
        },
        {
            "$addFields": {
                "truncatedTimestamp": {
                    "$dateTrunc": {"date": "$timestamp", "unit": bucket["classification_granularity"]}}
            }
        },
        {
            "$group": {
                "_id": "$truncatedTimestamp",
                "start": {"$first": "$timestamp"},
                "end": {"$last": "$timestamp"},
                "length": {"$sum": 1}
            }
        },
        {
            "$sort": {"_id": 1}
        },
        {
            "$lookup": {
                "from": "anomalyClassifications",
                "let": {"truncatedTime": "$_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$dateTrunc", "$$truncatedTime"]},
                                    {"$eq": ["$channel", channel]},
                                    {"$eq": ["$TID", TID]}
                                ]
                            }
                        }
                    }
                ],
                "as": "algos"
            }
        },
        {
            "$project": {
                "truncatedTimestamp": "$_id",
                "algos": 1,
                "start": 1,
                "end": 1,
                "length": 1,
            }
        }
    ]

    aggregated = list(db["timeSeriesData"].aggregate(pipeline))
    return aggregated


def get_classifications(db: Database, TID: ObjectId, channel: str):
    return list(db["anomalyClassifications"].find({"TID": TID, "channel": channel}))


# ----------------------------------------------
#              Anomalies
# ----------------------------------------------

def overlapping(start1, end1, start2, end2):
    if start1 <= start2 and end1 >= end2:
        return 1
    elif end1 < start2 or end2 < start1:
        return 0
    elif end1 == start2 or start1 == end2:
        return 1 / float(end2 - start2 + 1)
    return (min(end1, end2) - max(start1, start2)) / float(end2 - start2)


def delete_specific_anomaly(db: Database, AID: ObjectId):
    anomaly = get_anomaly(db, AID)
    ts = get_timeseries(db, anomaly["TID"])
    caching.invalidate_caches(str(ts["BID"]))
    db["anomalies"].delete_one({"_id": AID})


def update_specific_anomaly(db: Database, AID: ObjectId, rating: int = None, keep: bool = None,
                            bookmark: bool = None):
    update_query = {}
    if rating is not None:
        update_query["rating"] = rating
    if keep is not None:
        update_query["keep"] = keep
    if bookmark is not None:
        update_query["bookmark"] = bookmark
    db["anomalies"].update_one({"_id": AID}, {"$set": update_query})


def delete_anomalies(db: Database, TID: ObjectId, delete_manual_anomalies: bool = False):
    query = {"TID": TID}
    ts = get_timeseries(db, TID)
    if not delete_manual_anomalies:
        query["keep"] = False
    db["anomalies"].delete_many(query)
    caching.invalidate_caches(str(ts["BID"]))


def get_anomalies(db: Database, BID: ObjectId = None, TID: ObjectId = None, include_ts_data: bool = False,
                  only_marked: bool = False, only_manual: bool = False, only_bookmarked: bool = False):
    if BID is None and TID is None:
        raise ValueError("Either BID or TID must be set!")
    query = {}
    if BID is not None:
        query = {"BID": BID}
    if TID is not None:
        query = {"TID": TID}
    if only_marked:
        query["keep"] = True
    if only_manual:
        query["manual"] = True
    if only_bookmarked:
        query["bookmark"] = True
    anomalies = list(db["anomalies"].find(query))
    if include_ts_data:
        for anomaly in anomalies:
            anomaly["ts_data"] = query_timeseries(db, anomaly["TID"], from_=anomaly["start"], to_=anomaly["end"],
                                                  n_segments=None, channel=anomaly["channel"])
            for ts in anomaly["ts_data"]:
                ts["timestamp_string"] = str(ts["timestamp"])
    if len(anomalies) == 0:
        return []
    scores = list(MinMaxScaler().fit_transform(np.array([a["score"] for a in anomalies]).reshape(-1, 1)))
    lengths = list(MinMaxScaler().fit_transform(np.array([a["length"] for a in anomalies]).reshape(-1, 1)))
    length_score_norm = [math.sqrt(pow(s, 2) + pow(l, 2)) for s, l in zip(scores, lengths)]
    for idx, anomaly in enumerate(anomalies):
        anomaly["length_score"] = length_score_norm[idx]
        anomaly["start_string"] = str(anomaly["start"])
        anomaly["end_string"] = str(anomaly["end"])
    return anomalies


def get_anomaly(db: Database, AID: ObjectId, include_ts_data: bool = True, extension: float = 2):
    anomaly = db["anomalies"].find_one({"_id": ObjectId(AID)})
    anomaly["timeSeriesName"] = db["timeSeries"].find_one({"_id": anomaly["TID"]})["name"]
    if include_ts_data:
        timespan = abs((anomaly["start"] - anomaly["end"]).total_seconds())
        new_start = anomaly["start"] - datetime.timedelta(seconds=timespan * extension)
        new_end = anomaly["end"] + datetime.timedelta(seconds=timespan * extension)
        anomaly["ts_data"] = query_timeseries(
            db, anomaly["TID"], from_=new_start, to_=new_end,
            n_segments=None, channel=anomaly["channel"]
        )
        for ts in anomaly["ts_data"]:
            ts["timestamp_string"] = str(ts["timestamp"])
        anomaly["start_string"] = str(anomaly["start"])
        anomaly["end_string"] = str(anomaly["end"])
    return anomaly


def get_anomalies_for_explore(db: Database, BID: ObjectId):
    anomalies = [a for a in get_anomalies(db, BID=BID) if not a["manual"]]
    if len(anomalies) == 0:
        return []
    scores = list(MinMaxScaler().fit_transform(np.array([a["score"] for a in anomalies]).reshape(-1, 1)))
    lengths = list(MinMaxScaler().fit_transform(np.array([a["length"] for a in anomalies]).reshape(-1, 1)))
    length_score_norm = [math.sqrt(pow(s, 2) + pow(l, 2)) for s, l in zip(scores, lengths)]
    length_score_norm = list(MinMaxScaler().fit_transform(np.array(length_score_norm).reshape(-1, 1)))
    view_norm = list(MinMaxScaler().fit_transform(np.array([item["views"] for item in anomalies]).reshape(-1, 1)))
    for idx, item in enumerate(anomalies):
        item["length_score"] = float(length_score_norm[idx])
        item["views_norm"] = float(view_norm[idx])
    return anomalies


def get_ratings(db: Database, BID: ObjectId):
    res = list(db["anomalies"].find({"BID": BID}, {"_id": 1, "rating": 1}))
    return {str(a["_id"]): a["rating"] for a in res}


def extract_anomalies_scoring(db: Database, TID: ObjectId, threshold: float):
    ts = get_timeseries(db, TID)
    found_anomalies = []
    for channel in ts["channels"]:
        data = query_timeseries(db, TID, channel, n_segments=None)
        start = None
        anomaly_score = 0
        length = 0
        base = {"TID": TID, "BID": ts["BID"], "channel": channel, "keep": False, "bookmark": False, "manual": False,
                "rating": 0, "views": 0}
        for i, data_point in enumerate(data):
            if data_point["ensemble_processed"] >= threshold:
                if start is None:
                    start = data_point["timestamp"]
                anomaly_score += data_point["ensemble_processed"]
                length += 1
            elif start is not None:
                if length >= 5:
                    found_anomalies.append({"start": start, "end": data[i - 1]["timestamp"], "length": length,
                                            "score": anomaly_score / length, **base})
                start = None
                anomaly_score = 0
                length = 0
        if start is not None and length >= 5:
            found_anomalies.append({"start": start, "end": data[len(data) - 1]["timestamp"], "length": length,
                                    "score": anomaly_score / length, **base})
    return found_anomalies


def extract_anomalies_classification(db: Database, TID: ObjectId, method: str):
    ts = get_timeseries(db, TID)
    algos = get_bucket_algorithms(db, ts["BID"])
    found_anomalies = []
    for channel in ts["channels"]:
        base = {"TID": TID, "BID": ts["BID"], "channel": channel, "keep": False, "bookmark": False, "manual": False,
                "rating": 0, "views": 0}
        segments = get_classifications_per_segment(db, TID, channel)
        for segment in segments:
            maj_vote = (len(segment["algos"]) / len(algos)) > 0.5 and method == "majority"
            max_vote = len(segment["algos"]) >= 1 and method == "max"
            if maj_vote or max_vote:
                found_anomalies.append(
                    {"start": segment["start"], "end": segment["end"], "length": segment["length"], "score": 1,
                     **base})
    return found_anomalies


def extract_anomalies(db: Database, TID: ObjectId, BID: ObjectId):
    ts = get_timeseries(db, TID)
    bucket = get_bucket(db, BID)
    if bucket["type"] == "scoring":
        found_anomalies = extract_anomalies_scoring(db, TID, bucket["threshold"])
    else:
        found_anomalies = extract_anomalies_classification(db, TID, bucket["classification_ensemble"])
    if len(found_anomalies) == 0:
        return
    print(TID, len(found_anomalies))
    saved_anomalies = get_anomalies(db, TID=TID, only_marked=True)
    filtered_anomalies = []
    for channel in ts["channels"]:
        channel_anomalies = [a for a in found_anomalies if a["channel"] == channel]
        saved_channel_anomalies = [a for a in saved_anomalies if a["channel"] == channel]
        for anomaly in channel_anomalies:
            overlaps = False
            for saved_anomaly in saved_channel_anomalies:
                overlap = overlapping(
                    anomaly["start"].timestamp(),
                    anomaly["end"].timestamp(),
                    saved_anomaly["start"].timestamp(),
                    saved_anomaly["end"].timestamp(),
                )
                if anomaly["start"].timestamp() >= saved_anomaly["start"].timestamp() and anomaly[
                    "end"].timestamp() <= \
                        saved_anomaly["end"].timestamp():
                    overlaps = True
                if overlap >= 0.9:
                    overlaps = True
            if not overlaps:
                filtered_anomalies.append(anomaly)
    if len(filtered_anomalies) == 0:
        return
    db["anomalies"].insert_many(filtered_anomalies)
    caching.invalidate_caches(str(BID))


def add_anomaly(db: Database, data):
    ts = get_timeseries(db, ObjectId(data["TID"]))
    caching.invalidate_caches(str(ts["BID"]))

    data["TID"] = ObjectId(data["TID"])
    data["BID"] = ts["BID"]
    data["start"] = parser.parse(data["start"])
    data["end"] = parser.parse(data["end"])
    if data["start"] == data["end"]:
        return
    if data["start"] > data["end"]:
        data["start"], data["end"] = data["end"], data["start"]
    data["score"] = 1
    query = {
        "ids.TID": data["TID"],
        "timestamp": {
            "$gte": data["start"],
            "$lte": data["end"]
        }
    }
    data["length"] = db["timeSeriesData"].count_documents(query)
    data["keep"] = True
    data["manual"] = True
    data["rating"] = 2
    data["views"] = 0
    db["anomalies"].insert_one(data)


def toggle_nominal(db: Database, data):
    data["TID"] = ObjectId(data["TID"])
    ts = get_timeseries(db, data["TID"])
    bucket = get_bucket(db, ts["BID"])
    granularity = bucket["classification_granularity"]
    data["granularity"] = granularity
    if granularity != "full":
        data["date"] = parser.parse(data["date"])
        data["date"] = truncate_datetime_to_iso(data["date"], granularity)
    else:
        data["date"] = None
    print(data)
    nominals = get_nominals(db, data["TID"], False, data["channel"])
    for nominal in nominals:
        if nominal["date"] == data["date"]:
            delete_specific_nominal(db, nominal["_id"])
            return "delete"
    db["nominals"].insert_one(data)
    return "add"


def get_nominals(db: Database, TID: ObjectId, include_ts_data: bool = False, channel: str = None):
    ts = get_timeseries(db, TID)
    bucket = get_bucket(db, ts["BID"])

    query = {"TID": TID}
    if channel:
        query["channel"] = channel
    nominals = list(db["nominals"].find(query))
    for nominal in nominals:
        if bucket["classification_granularity"] == "full":
            tsData = list(db["timeSeriesData"].find({"ids.TID": TID}, {"timestamp": 1, "_id": 0}))
            start, end = tsData[0]["timestamp"], tsData[-1]["timestamp"]
        else:
            start, end = iso_to_date_range(nominal["date"], nominal["granularity"])
        nominal["start"], nominal["end"] = start, end
        if include_ts_data:
            nominal["ts_data"] = query_timeseries(
                db, TID, from_=start, to_=end, n_segments=2000,
                channel=nominal["channel"], only_ts=True
            )
    return nominals


def get_nominal(db: Database, NID: ObjectId, include_ts_data: bool = True, extension: float = 2):
    nominal = db["nominals"].find_one({"_id": ObjectId(NID)})
    start, end = iso_to_date_range(nominal["date"], nominal["granularity"])
    nominal["start"], nominal["end"] = start, end
    if include_ts_data:
        timespan = abs((start - end).total_seconds())
        new_start = start - datetime.timedelta(seconds=timespan * extension)
        new_end = end + datetime.timedelta(seconds=timespan * extension)
        nominal["ts_data"] = query_timeseries(
            db, nominal["TID"], from_=new_start, to_=new_end,
            n_segments=1000, channel=nominal["channel"]
        )
    return nominal


def get_all_nominals(db: Database, BID: ObjectId, channel: str):
    ts_list = list_timeseries(db, BID)
    nominals = []
    for ts in ts_list:
        nominals.extend(get_nominals(db, ts["_id"], True, channel))
    return nominals


def delete_specific_nominal(db: Database, NID: ObjectId):
    db["nominals"].delete_one({"_id": NID})


def delete_nominal_by_date(db: Database, data):
    data["TID"] = ObjectId(data["TID"])
    ts = get_timeseries(db, data["TID"])
    bucket = get_bucket(db, ts["BID"])
    granularity = bucket["classification_granularity"]
    if granularity != "full":
        data["date"] = parser.parse(data["date"])
        data["date"] = truncate_datetime_to_iso(data["date"], granularity)
    else:
        del data["date"]
    db["nominals"].delete_one(data)


def reset_ratings(db: Database, TID: ObjectId):
    anomalies = get_anomalies(db, TID=TID, include_ts_data=False)
    for anomaly in anomalies:
        db["anomalies"].update_one({"_id": anomaly["_id"], "manual": False},
                                   {"$set": {"rating": 0, "keep": anomaly.get("bookmark", False)}})


def find_similar_bookmark(db: Database, BID: ObjectId, AID: ObjectId, max_distance: float = 0.3,
                          length_tolerance: float = 0.1):
    anomaly = get_anomaly(db, AID, include_ts_data=True, extension=0)
    channel = anomaly["channel"]
    anomaly_values = np.array([m["value"] for m in anomaly["ts_data"]])
    anomaly_values = MinMaxScaler().fit_transform(anomaly_values.reshape(-1, 1)).reshape(1, -1)[0]
    bookmark_anomalies = get_anomalies(db, BID, None, True, False, False, True)
    similar = []
    for bookmark in bookmark_anomalies:
        if bookmark["channel"] != channel:
            continue
        bookmark_values = np.array([m["values"][channel] for m in bookmark["ts_data"]])
        avg_length = (len(bookmark_values) + len(anomaly_values)) / 2
        if abs(len(anomaly_values) - len(bookmark_values)) / avg_length > length_tolerance:
            continue
        bookmark_values = MinMaxScaler().fit_transform(bookmark_values.reshape(-1, 1)).reshape(1, -1)[0]
        sim = fastdtw(bookmark_values, anomaly_values, dist=2)[0]
        if sim < avg_length * max_distance:
            similar.append((sim, bookmark))
    return similar


def increase_view(db: Database, AID: ObjectId):
    db["anomalies"].update_one({"_id": AID}, {"$inc": {"views": 1}})


def reset_views(db: Database, BID: ObjectId):
    for ts in list_timeseries(db, BID):
        db["anomalies"].update_many({"TID": ts["_id"]}, {"$set": {"views": 0}})


def get_heatmap_data(db: Database, BID: ObjectId, channel: str, mode: str, n_segments=1000):
    if mode not in ["score", "std", "labels"]:
        raise ValueError("Unknown mode for heatmap generation")
    ts_list = list_timeseries(db, BID)
    scores = []
    for ts in ts_list:
        if channel not in ts["channels"]:
            scores.append([None for _ in range(n_segments)])
            continue
        data = query_timeseries(db, ts["_id"], channel=channel, n_segments=n_segments)
        if mode == "score":
            channel_scores = [p["ensemble_processed"] for p in data]
        elif mode == "labels":
            is_label, labels, ensemble_scores = get_ts_labels(ts["_id"], all_anomalies=True, only_marked=False,
                                                              channel=channel)
            channel_scores = labels[0].tolist()
        else:
            channel_scores = np.std(np.array([list(p["score"].values()) for p in data]), axis=1).tolist()
        if len(channel_scores) < n_segments:
            channel_scores.extend([None for _ in range(n_segments - len(channel_scores))])
        scores.append(channel_scores)
    return scores


def get_binary_anomaly_ts(db: Database, AID: ObjectId, n_segments: int | None = 30):
    anomaly = get_anomaly(db, AID, include_ts_data=False, extension=0)
    ts = query_timeseries(db, anomaly["TID"], n_segments=None, channel=anomaly["channel"])
    binary_ts = [int(anomaly["start"] <= item["timestamp"] <= anomaly["end"]) for item in ts]
    if n_segments is not None and n_segments < len(binary_ts):
        window_size = len(binary_ts) // n_segments
        binary_ts_reduced = []
        for i in range(n_segments):
            subset = binary_ts[i * window_size: (i + 1) * window_size]
            binary_ts_reduced.append(int(np.max(subset)))
        return binary_ts_reduced
    return binary_ts


def dissimilar_recommender(db: Database, BID: ObjectId, k=3, only_unrated=True):
    anomalies = get_anomalies(db, BID)
    scores = np.array([(a["rating"], a["length_score"]) for a in anomalies])
    scores = MinMaxScaler().fit_transform(scores)
    views = scores[:, 0]
    scores = np.sum(scores, axis=1)
    id_scores = sorted([(i, a["_id"], score) for i, a, score in zip(range(len(anomalies)), anomalies, scores)],
                       key=lambda x: x[2], reverse=True)
    dtw_matrix = clustering.dtw_matrix(str(BID))
    length_matrix = np.array([[abs(a["length"] - b["length"]) for b in anomalies] for a in anomalies])
    ranking = []
    for item in id_scores:
        dtw_values = MinMaxScaler().fit_transform(dtw_matrix[item[0], :].reshape(-1, 1))[:, 0]
        length_values = MinMaxScaler().fit_transform(length_matrix[item[0], :].reshape(-1, 1))[:, 0]
        item_scores = sorted([(a, score) for a, score in zip(anomalies, dtw_values + (1 - length_values))],
                             key=lambda x: x[1], reverse=True)
        if only_unrated:
            item_scores = [item for item in item_scores if item[0]["rating"] == 0]
        ranking.append([str(item[1]), [str(e[0]["_id"]) for e in item_scores[:k]]])
    return ranking


def collab_filtering(db: Database, BID: ObjectId, k=5):
    def estimate_rating(i, dtw, ratings):
        k_nearest = np.argpartition(dtw[i, :], -k)[-k:]
        summed_similarities = np.sum(np.abs(dtw[i, k_nearest]))
        sum_ = np.sum([dtw[i, j] * ratings[j] for j in k_nearest])
        return sum_ / summed_similarities

    dtw_matrix = clustering.dtw_matrix(str(BID))
    dtw_matrix = 1 - MinMaxScaler().fit_transform(dtw_matrix)
    anomalies = get_anomalies(db, BID)
    ratings = np.array([a["rating"] for a in anomalies])
    ratings = [(r + 5) / 10 for r in ratings]
    estimated_ratings = np.array([estimate_rating(i, dtw_matrix, ratings) for i in range(len(anomalies))])
    estimated_ratings = MinMaxScaler().fit_transform(estimated_ratings.reshape(-1, 1))[:, 0]
    items = [(float(r), a["_id"]) for r, a in zip(estimated_ratings, anomalies)]
    return sorted(items, key=lambda x: x[0], reverse=True)


def severities_sort(db: Database, BID: ObjectId):
    anomalies = get_anomalies(db, BID)
    scores = np.array([a["length_score"] for a in anomalies])
    if len(scores) > 0:
        scores = MinMaxScaler().fit_transform(scores.reshape(-1, 1))[:, 0]
    ratings = np.array([a["rating"] for a in anomalies])
    scores = [r + s for r, s in zip(ratings, scores)]
    id_scores = sorted([(score, a["_id"]) for a, score in zip(anomalies, scores)], key=lambda x: x[0], reverse=True)
    return id_scores


if __name__ == '__main__':
    db = get_db()
    # res = get_classifications_per_segment(db, ObjectId("67b821fbd8ca4c72a49b5852"), "co2")
    # pprint(res)
    # ts_list = ['67d088e4646ed9b43edb33c3']
    # res = query_ts_list_anomaly_scores(db, ts_list, "value-0")
    # print(res)

    # min_value, max_value, histogram = bucket_minmax(db, ObjectId("67c6a3d471129c260000c7ef"), "value-0")
    # print(min_value, max_value, histogram)
    # print("Start")
    # res = get_classifications_per_segment(db, ObjectId("679b50f29fd81282634844f8"), "co2")
    # for item in res:
    #     print(item["truncatedTimestamp"], item["algos"])

    scores, ratios = query_ts_list_anomaly_scores(db, ["67fad1535bcebb5169b3870c"], "ch1", n_segments=5000)
    query_res = query_timeseries(db, ObjectId("67fad1535bcebb5169b3870c"), "ch1", n_segments=5000)
    print(query_res[0])
    values = [d["value"] for d in query_res]
    ensemble = [d["ensemble"] for d in query_res]
    fig, ax = plt.subplots(nrows=3, ncols=1)
    ax[0].plot(values)
    ax[1].plot(ensemble)
    ax[2].plot(scores)
    plt.show()
