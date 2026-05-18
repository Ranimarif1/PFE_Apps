#!/usr/bin/env python3
"""
Creates the first AdminIT account directly in MongoDB.
Run this on the server after setup.sh completes.

Usage:
    cd /opt/radiology
    sudo venv/bin/python deploy/create-admin.py
"""
import sys
import os
import getpass
import datetime
import re

# Add Django app to path for shared utilities
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api-server', 'django'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'api-server', 'django', '.env'))

import bcrypt
from pymongo import MongoClient

MONGODB_URI    = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB     = os.getenv("MONGODB_DB_NAME", "radiology_platform")

def validate_email(email):
    return re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email) is not None

def validate_password(pwd):
    if len(pwd) < 8:
        return "Au moins 8 caractères requis."
    if not re.search(r'[A-Z]', pwd):
        return "Au moins une majuscule requise."
    if not re.search(r'[0-9]', pwd):
        return "Au moins un chiffre requis."
    if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', pwd):
        return "Au moins un caractère spécial requis."
    return None

def main():
    print("=" * 50)
    print("  Création du compte AdminIT initial")
    print("=" * 50)

    client = MongoClient(MONGODB_URI)
    db     = client[MONGODB_DB]
    users  = db["users"]

    # Check if an adminIT already exists
    existing = users.find_one({"role": "adminIT"})
    if existing:
        print(f"\n[!] Un compte AdminIT existe déjà : {existing['email']}")
        confirm = input("Voulez-vous en créer un autre ? (o/N) : ").strip().lower()
        if confirm != 'o':
            print("Annulé.")
            sys.exit(0)

    # Collect info
    print()
    while True:
        nom = input("Nom        : ").strip()
        if nom: break
        print("  Champ requis.")

    while True:
        prenom = input("Prénom     : ").strip()
        if prenom: break
        print("  Champ requis.")

    while True:
        email = input("Email      : ").strip().lower()
        if not validate_email(email):
            print("  Email invalide.")
            continue
        if users.find_one({"email": email}):
            print("  Cet email existe déjà.")
            continue
        break

    while True:
        pwd = getpass.getpass("Mot de passe : ")
        err = validate_password(pwd)
        if err:
            print(f"  {err}")
            continue
        pwd2 = getpass.getpass("Confirmer    : ")
        if pwd != pwd2:
            print("  Les mots de passe ne correspondent pas.")
            continue
        break

    hashed = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()
    now    = datetime.datetime.utcnow().isoformat()

    doc = {
        "email":     email,
        "password":  hashed,
        "role":      "adminIT",
        "nom":       nom,
        "prenom":    prenom,
        "genre":     "",
        "status":    "validated",
        "avatar":    None,
        "createdAt": now,
        "updatedAt": now,
    }

    users.insert_one(doc)
    print(f"\n[✔] Compte AdminIT créé avec succès : {email}")
    print("    Vous pouvez maintenant vous connecter à l'application.\n")

if __name__ == "__main__":
    main()
