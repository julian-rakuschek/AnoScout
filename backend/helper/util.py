import random
from datetime import datetime, timedelta

import dtaidistance
import numpy as np
from aeon.distances import dtw_pairwise_distance, euclidean_pairwise_distance
from bson import ObjectId
from sklearn.decomposition import PCA
from sklearn.metrics import euclidean_distances
from sklearn.preprocessing import StandardScaler
from scipy.stats.mstats import winsorize
from backend.helper import database, caching


def truncate_datetime_to_iso(date: datetime, granularity: str):
    if granularity == 'month':
        return date.strftime('%Y-%m')
    elif granularity == 'day':
        return date.strftime('%Y-%m-%d')
    elif granularity == 'hour':
        return date.strftime('%Y-%m-%dT%H')
    elif granularity == 'minute':
        return date.strftime('%Y-%m-%dT%H:%M')
    else:
        raise "Unknown granularity"


def iso_to_date_range(date_str: str, granularity: str):
    if granularity == 'month':
        start = datetime.strptime(date_str, '%Y-%m')
        next_month = start.month % 12 + 1
        next_year = start.year + (start.month // 12)
        end = datetime(next_year, next_month, 1) - timedelta(seconds=1)
    elif granularity == 'day':
        start = datetime.strptime(date_str, '%Y-%m-%d')
        end = start + timedelta(days=1) - timedelta(seconds=1)
    elif granularity == 'hour':
        start = datetime.strptime(date_str, '%Y-%m-%dT%H')
        end = start + timedelta(hours=1) - timedelta(seconds=1)
    elif granularity == 'minute':
        start = datetime.strptime(date_str, '%Y-%m-%dT%H:%M')
        end = start + timedelta(minutes=1) - timedelta(seconds=1)
    else:
        raise ValueError("Unknown granularity")
    return start, end

def find_closest(timestamps: list, needle: str):
    diffs = np.array([abs((timestamp - needle).total_seconds()) for timestamp in timestamps])
    return np.argmin(diffs)


def get_ts_labels(TID: ObjectId, channel: str, weights=None, only_manual: bool = False, all_anomalies: bool = False, only_marked: bool = True):
    db = database.get_db()
    ts_data = database.query_timeseries(db, TID, channel)
    anomalies = database.get_anomalies(db, TID=TID, include_ts_data=True, only_manual=only_manual, only_marked=only_marked)
    nominals = database.get_nominals(db, TID, include_ts_data=True)
    timestamps = [m["timestamp"] for m in ts_data]
    is_label, labels, ensemble_scores = [], [], []

    channel_is_label, channel_labels = np.zeros(len(timestamps)), np.zeros(len(timestamps))

    if weights is None:
        channel_ensemble_scores = [m["ensemble"] for m in ts_data]
    else:
        temp = [list(m["score"].values()) for m in ts_data]
        channel_ensemble_scores = np.average(np.array(temp), axis=1, weights=weights)
    ensemble_scores.append(channel_ensemble_scores)

    for anomaly in anomalies:
        if not all_anomalies and anomaly["rating"] == 0:
            continue
        start_index = find_closest(timestamps, anomaly["start"])
        end_index = find_closest(timestamps, anomaly["end"])
        channel_is_label[start_index:end_index] = 1
        channel_labels[start_index:end_index] = 1

    for nominal in nominals:
        start_index = find_closest(timestamps, nominal["start"])
        end_index = find_closest(timestamps, nominal["end"])
        channel_is_label[start_index:end_index] = 1
    is_label.append(channel_is_label)
    labels.append(channel_labels)
    return is_label, labels, ensemble_scores


def add_dbr_pca_to_segments(BID: ObjectId, segments, normalize=True):
    y = caching.get_dtw_matrix(str(BID), "segments")
    if y is None:
        segment_values = [s["values"] for s in segments]
        if normalize:
            for segment in segment_values:
                min_value = np.min(segment)
                max_value = np.max(segment)
                for idx, value in enumerate(segment):
                    segment[idx] = (value - min_value) / (max_value - min_value)

        # y = dtaidistance.ed.distance_fast(segment_values)
        y = euclidean_distances(segment_values)
        caching.store_dtw_matrix(str(BID), y, "segments")

    projected = PCA(n_components=2).fit_transform(y)
    projected = winsorize(projected, limits=[0.005, 0.005])
    for idx in range(len(segments)):
        segments[idx]["x"] = projected[idx][0]
        segments[idx]["y"] = projected[idx][1]
        segments[idx]["dbr"] = y[idx]
    return segments
