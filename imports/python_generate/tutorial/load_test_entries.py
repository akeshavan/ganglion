def get_collection(port=3001):
    from pymongo import MongoClient
    client = MongoClient("localhost", port)
    db = client.meteor
    collection = db.subjects
    return collection, client

coll, cli = get_collection()
from glob import glob
import numpy as np
files = glob("sub*/anat/sub*_T1w.nii.gz")
for f in files:
    print("adding", f)
    entry = {"entry_type":"test", 
             "metrics":{"GMV": np.random.rand(), 
                        "wm": np.random.rand()}}
    Sid = f.split("/")[0]
    entry["subject_id"] = Sid #need to be unique
    entry["name"] = Sid #needs to be unique
    entry["check_masks"] = [f]
    coll.insert_one(entry)