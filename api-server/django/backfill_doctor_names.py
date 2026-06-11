"""
Backfill doctorName on reports that are missing it.

For each report without doctorName:
  - Look up the doctor in the users collection by doctorId
  - If found: store "{prenom} {nom}" (or email as fallback)
  - If not found (deleted doctor): store "[Médecin supprimé]"

Run from the django/ directory:
    python backfill_doctor_names.py
"""
import os
from pymongo import MongoClient
from bson import ObjectId

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGODB_DB_NAME", "radiology_platform")

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

reports_col = db["reports"]
users_col   = db["users"]

# Only process reports that have no doctorName (or empty string)
query = {"$or": [{"doctorName": {"$exists": False}}, {"doctorName": ""}]}
total = reports_col.count_documents(query)
print(f"Reports to backfill: {total}")

if total == 0:
    print("Nothing to do.")
    client.close()
    exit(0)

user_cache: dict = {}
updated = 0
skipped = 0

for report in reports_col.find(query, {"_id": 1, "doctorId": 1}):
    did = report.get("doctorId", "")
    if not did:
        skipped += 1
        continue

    if did not in user_cache:
        try:
            doc = users_col.find_one({"_id": ObjectId(did)}, {"nom": 1, "prenom": 1, "email": 1})
        except Exception:
            doc = None

        if doc:
            prenom = (doc.get("prenom") or "").strip()
            nom    = (doc.get("nom") or "").strip()
            user_cache[did] = f"{prenom} {nom}".strip() or doc.get("email", did)
        else:
            user_cache[did] = "[Médecin supprimé]"

    reports_col.update_one(
        {"_id": report["_id"]},
        {"$set": {"doctorName": user_cache[did]}},
    )
    updated += 1

print(f"Done. Updated: {updated}  Skipped (no doctorId): {skipped}")
client.close()
