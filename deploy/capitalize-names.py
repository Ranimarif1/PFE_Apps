#!/usr/bin/env python3
"""One-time migration: capitalize first letter of each word in nom and prenom for all users."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api-server', 'django'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'api-server', 'django', '.env'))
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB  = os.getenv("MONGODB_DB_NAME", "radiology_platform")

client = MongoClient(MONGODB_URI)
users  = client[MONGODB_DB]["users"]

updated = 0
for user in users.find({}, {"nom": 1, "prenom": 1}):
    fields = {}
    nom    = (user.get("nom") or "").strip()
    prenom = (user.get("prenom") or "").strip()
    cap_nom    = nom.title()
    cap_prenom = prenom.title()
    if nom    and nom    != cap_nom:    fields["nom"]    = cap_nom
    if prenom and prenom != cap_prenom: fields["prenom"] = cap_prenom
    if fields:
        users.update_one({"_id": user["_id"]}, {"$set": fields})
        updated += 1

print(f"[✔] {updated} user(s) updated.")
