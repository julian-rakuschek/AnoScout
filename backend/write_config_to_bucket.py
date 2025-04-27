import backend.helper.database as database
from backend.helper.config import get_config


def write_config_to_bucket():
    conf = get_config()["algorithms"]
    db = database.get_db()
    db["buckets"].update_many({}, {"$set": {"algorithm_settings": conf}})


if __name__ == "__main__":
    write_config_to_bucket()
