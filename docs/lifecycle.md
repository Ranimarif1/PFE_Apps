# Cycle de vie des rapports — ReportEase

## Vue d'ensemble

ReportEase applique une politique automatique de cycle de vie pour éviter la saturation
du disque et constituer un corpus audio/texte pour le réentraînement de Whisper.

---

## États d'un rapport

| Statut | Signification |
|--------|---------------|
| `draft` | Dictée commencée, non finalisée |
| `saved` | Dictée finalisée et transcription corrigée |
| `validated` | Validation médicale finale (Médecin Senior) |

---

## Tableau récapitulatif du cycle de vie

| Statut | Âge | Action |
|--------|-----|--------|
| `draft` | < 1 an | Aucune action — audio conservé |
| `draft` | ≥ 1 an | Audio supprimé — métadonnées MongoDB conservées — pas dans corpus |
| `saved` ou `validated` | < 30 jours | Aucune action (délai de grâce) |
| `saved` ou `validated` | 30 j – 2 ans | Converti en FLAC 16 kHz mono → `/opt/corpus/<année>/audio/` |
| `saved` ou `validated` | > 2 ans | FLAC supprimé du corpus — **transcription conservée à vie dans MongoDB** |
| Frozen testset | Quel que soit l'âge | Jamais supprimé — benchmark figé |

> **Règle absolue** : la transcription (texte) est conservée indéfiniment dans MongoDB,
> quoi qu'il arrive à l'audio. Seul le fichier audio peut être supprimé.

---

## Structure du corpus

```
/opt/corpus/
├── 2024/
│   ├── audio/          ← fichiers .flac convertis (Phase 1)
│   │   ├── <report_id>.flac
│   │   └── ...
│   └── metadata.jsonl  ← une ligne JSON par rapport
├── 2025/
│   └── ...
└── frozen_testset/
    ├── <report_id>.flac  ← 500 paires figées, jamais supprimées
    └── index.json        ← liste des IDs + date de constitution
```

### Format d'une ligne `metadata.jsonl`

```json
{
  "report_id": "6657a...",
  "status": "validated",
  "audio_path": "/opt/corpus/2024/audio/6657a....flac",
  "raw_transcription": "...",
  "final_transcription": "...",
  "duration_sec": 143,
  "finalized_at": "2024-03-15T10:22:00",
  "specialty": "scanner",
  "doctor_id_hash": "a3f8c1d200e5b7f9"
}
```

`audio_path` passe à `null` en Phase 3 (audio supprimé, transcription conservée).  
`doctor_id_hash` = SHA-256(doctorId)[:16] — aucun nom de patient ni de médecin dans les chemins.

---

## Seuils configurables

Dans `settings.py` ou via variables d'environnement :

| Paramètre | Défaut | Env var |
|-----------|--------|---------|
| `LIFECYCLE_GRACE_PERIOD_DAYS` | 30 | `LIFECYCLE_GRACE_PERIOD_DAYS` |
| `LIFECYCLE_DRAFT_MAX_AGE_DAYS` | 365 | `LIFECYCLE_DRAFT_MAX_AGE_DAYS` |
| `LIFECYCLE_CORPUS_RETENTION_DAYS` | 730 | `LIFECYCLE_CORPUS_RETENTION_DAYS` |
| `LIFECYCLE_FROZEN_TESTSET_SIZE` | 500 | `LIFECYCLE_FROZEN_TESTSET_SIZE` |
| `LIFECYCLE_CORPUS_ROOT` | `/opt/corpus` | `LIFECYCLE_CORPUS_ROOT` |

---

## Lancer manuellement

### Depuis le serveur

```bash
# Se connecter au serveur
ssh radio@<IP_SERVEUR>
cd /opt/radiology/api-server/django

# Simulation (dry-run) — aucune modification
python manage.py lifecycle_cleanup --dry-run

# Simulation d'une phase précise
python manage.py lifecycle_cleanup --dry-run --phase=1

# Exécution réelle (toutes phases)
python manage.py lifecycle_cleanup

# Exécution d'une phase précise
python manage.py lifecycle_cleanup --phase=2
```

### Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Simule sans rien modifier |
| `--phase 1` | Phase 1 uniquement (archivage FLAC) |
| `--phase 2` | Phase 2 uniquement (suppression drafts) |
| `--phase 3` | Phase 3 uniquement (nettoyage corpus ancien) |
| `--phase all` | Toutes les phases (défaut) |

---

## Timer systemd

### Installer le timer (une seule fois)

```bash
# Copier les fichiers depuis le dépôt
sudo cp deploy/radiology-lifecycle.service /etc/systemd/system/
sudo cp deploy/radiology-lifecycle.timer   /etc/systemd/system/

# Activer et démarrer le timer
sudo systemctl daemon-reload
sudo systemctl enable --now radiology-lifecycle.timer

# Vérifier que le timer est actif
sudo systemctl status radiology-lifecycle.timer
```

### Déclencher manuellement via systemd

```bash
sudo systemctl start radiology-lifecycle.service
```

---

## Lire les logs

```bash
# Logs du dernier run
journalctl -u radiology-lifecycle.service -n 100

# Logs en temps réel (pendant un run)
journalctl -u radiology-lifecycle.service -f

# Historique complet
journalctl -u radiology-lifecycle.service --since "7 days ago"
```

---

## Interface adminIT

La page **Lifecycle** dans le tableau de bord adminIT (`/adminit/lifecycle`) affiche :

- Volume disque utilisé (`/opt/corpus`, `media/audios`)
- Nombre de rapports par statut et par phase en attente
- Taille du corpus FLAC et du testset figé
- Date et résumé du dernier run
- Bouton **Dry-run** (simulation) et **Exécuter** (réel)
- Historique des 20 derniers runs

---

## Restaurer un audio depuis une sauvegarde

L'audio physique peut être supprimé par le cycle de vie, mais la transcription reste
dans MongoDB. Pour restaurer un audio depuis une sauvegarde :

1. Identifier le `report_id` dans MongoDB ou l'interface adminIT.
2. Localiser l'audio dans la sauvegarde système (par `examId` ou `report_id`).
3. Copier le fichier dans `media/audios/` sur le serveur :
   ```bash
   scp audio_source.webm radio@<IP>:/opt/radiology/api-server/media/audios/<filename>
   ```
4. Si le FLAC corpus est manquant mais le webm est disponible, relancer Phase 1 :
   ```bash
   python manage.py lifecycle_cleanup --phase=1
   ```

---

## Politique de rétention vis-à-vis du dossier médical

Conformément aux exigences de conservation des dossiers médicaux :

- **La transcription** (champ `content` / `originalContent` dans MongoDB)
  est conservée **indéfiniment**, quelle que soit l'ancienneté du rapport.
- **L'audio** est un support temporaire servant à la transcription et au réentraînement.
  Sa suppression n'affecte pas le dossier médical numérique.
- Les statuts `saved` et `validated` sont permanents dans MongoDB et ne sont jamais supprimés.
- Le champ `doctor_id_hash` dans le corpus garantit l'anonymisation des données
  d'entraînement : aucun nom de patient ni de médecin n'apparaît dans les fichiers corpus.

---

## Ajuster les seuils en production

Exemple : porter la période de grâce à 60 jours et la rétention à 3 ans :

```bash
# Dans /opt/radiology/.env
LIFECYCLE_GRACE_PERIOD_DAYS=60
LIFECYCLE_CORPUS_RETENTION_DAYS=1095
```

Puis redémarrer le service Django :
```bash
sudo systemctl restart radiology-django
```

Les nouvelles valeurs sont effectives au prochain run du timer.
