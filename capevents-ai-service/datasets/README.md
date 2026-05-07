# Datasets CapEvents AI

Ce dossier contient les datasets utilisés pour entraîner et évaluer les modules IA de CapEvents.

## 1. Sources

Les données utilisées dans cette version sont hybrides :

- exports CapEvents ;
- données synthétiques générées pour augmenter la volumétrie ;
- données externes autorisées, nettoyées et normalisées ;
- données préparées pour le modèle de recommandation.

Ces données servent au développement, à l’entraînement initial et à la démonstration du projet.

## 2. Important

Les CSV dans `datasets/raw/capevents` ne sont pas utilisés comme source runtime par FastAPI.

En runtime, le service IA lit les données depuis PostgreSQL via `app/data/runtime_loader.py`.

## 3. Dossiers

- `raw/capevents` : exports CapEvents enrichis pour entraînement.
- `external/kaggle` : sources externes brutes.
- `processed` : datasets nettoyés et prêts pour entraînement.

## 4. Stratégie professionnelle

Les futures versions des modèles devront utiliser des snapshots datés et documentés.

Chaque dataset d’entraînement doit idéalement inclure :

- une date de génération ;
- une liste de sources ;
- une taille ;
- des règles de nettoyage ;
- un champ `data_source` si plusieurs sources sont combinées ;
- un champ `sample_weight` si certaines sources doivent peser moins dans l’apprentissage.