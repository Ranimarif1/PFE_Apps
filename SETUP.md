# Guide d'installation — ReportEase

Ce guide explique comment faire tourner l'application sur un nouveau PC.

---

## Prérequis à installer

| Outil | Version min | Téléchargement |
|---|---|---|
| Python | 3.10+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| MongoDB Community | 7.0+ | https://www.mongodb.com/try/download/community |
| Ollama | dernière | https://ollama.com/download |
| Git | n'importe | https://git-scm.com/ |

---

## 1. Cloner le projet

```bash
git clone https://github.com/Ranimarif1/PFE_Apps.git
cd PFE_Apps
```

---

## 2. Configurer le backend Django (Python)

### 2.1 Créer l'environnement virtuel

```bash
cd api-server
python -m venv venv
```

Activer le venv :
- **Windows** : `venv\Scripts\activate`
- **Mac/Linux** : `source venv/bin/activate`

### 2.2 Installer les dépendances Python

```bash
pip install -r requirements.txt
```

> ⚠️ L'installation de `transformers`, `torch` et `librosa` peut prendre plusieurs minutes.

### 2.3 Créer le fichier `.env`

Créer le fichier `api-server/django/.env` avec ce contenu :

```env
DJANGO_SECRET_KEY=une-cle-secrete-quelconque
JWT_SECRET_KEY=une-autre-cle-jwt
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=radiology_platform
DEBUG=1

# Email (Gmail) — pour les notifications d'inscription
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=1
EMAIL_HOST_USER=ton.email@gmail.com
EMAIL_HOST_PASSWORD=mot-de-passe-application-gmail
DEFAULT_FROM_EMAIL=ton.email@gmail.com
FRONTEND_URL=http://localhost:8080
```

> Pour le mot de passe Gmail : activer la validation en 2 étapes, puis créer un **mot de passe d'application** sur https://myaccount.google.com/apppasswords

### 2.4 Créer les comptes de test

```bash
cd api-server/django
python ../seed_users.py
```

Cela crée :
- **Médecin** : `doctor@test.com` / `Doctor123!!`
- **Admin** : `admin@radio.com` / `Admin123!`
- **AdminIT** : `adminit@radio.com` / `Admin123!`

---

## 3. Télécharger le modèle Whisper

Le modèle se télécharge automatiquement au **premier lancement** du serveur Django (environ 1.5 Go). Assure-toi d'avoir une bonne connexion internet la première fois.

Modèle utilisé : `amnbk/whisper-medium-medical-fr-v2` (HuggingFace)

---

## 4. Configurer Ollama (correction orthographique IA)

Après avoir installé Ollama, télécharger le modèle :

```bash
ollama pull qwen2:0.5b
```

Ollama doit tourner en arrière-plan (il se lance automatiquement au démarrage sur Windows).

---

## 5. Configurer le serveur Node.js (enregistrement smartphone)

```bash
cd api-server
npm install
```

Créer le fichier `api-server/server/.env` :

```env
PORT=4000
```

---

## 6. Configurer le frontend (React)

```bash
cd desktop
npm install
```

Créer le fichier `desktop/.env` :

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_NODE_SERVER_URL=http://localhost:4000
```

---

## 7. Lancer l'application

Il faut **4 terminaux** ouverts en même temps :

### Terminal 1 — MongoDB
MongoDB se lance automatiquement en tant que service Windows après installation.
Si ce n'est pas le cas :
```bash
mongod
```

### Terminal 2 — Django (API principale)
```bash
cd api-server
venv\Scripts\activate        # Windows
cd django
python manage.py runserver   # port 8000
```

### Terminal 3 — Node.js (sessions smartphone)
```bash
cd api-server
npm run server               # port 4000
```

### Terminal 4 — Frontend React
```bash
cd desktop
npm run dev                  # port 8080
```

Ouvrir le navigateur sur : **http://localhost:8080**

---

## Résumé des ports

| Service | Port |
|---|---|
| Frontend React | 8080 |
| Django API | 8000 |
| Node.js (smartphone) | 4000 |
| MongoDB | 27017 |
| Ollama | 11434 |

---

## Comptes de test

| Rôle | Email | Mot de passe |
|---|---|---|
| Médecin | `doctor@test.com` | `Doctor123!!` |
| Admin | `admin@radio.com` | `Admin123!` |
| AdminIT | `adminit@radio.com` | `Admin123!` |

---

## Problèmes fréquents

**"Module not found" Python**
→ Vérifier que le venv est activé (`venv\Scripts\activate`)

**"Cannot connect to MongoDB"**
→ Lancer MongoDB : `net start MongoDB` dans un terminal administrateur

**"Ollama indisponible"**
→ La correction IA est optionnelle, l'application fonctionne sans. Lancer Ollama manuellement si besoin.

**Le modèle Whisper plante au démarrage**
→ Ajouter `torch` dans `requirements.txt` et relancer `pip install -r requirements.txt`

**Port déjà utilisé**
→ `netstat -ano | findstr :8000` pour trouver le processus, puis `taskkill /PID <pid> /F`
