# Documentation technique IA — CapEvents AI Service

## Objectif du document

Ce document présente la partie intelligence artificielle du projet CapEvents.

Il décrit :

- l'architecture générale du service IA ;
- les modules IA disponibles ;
- les datasets utilisés ;
- les modèles entraînés ;
- les endpoints FastAPI ;
- la sécurité ;
- le monitoring ;
- les décisions de mise en production ;
- les limites actuelles ;
- les améliorations futures.

## Architecture générale

Le service IA est un service indépendant basé sur FastAPI.

Le flux applicatif recommandé est :

Angular → Spring Boot → FastAPI IA → PostgreSQL / modèles IA

Le frontend Angular ne doit pas appeler directement FastAPI IA.

Le backend Spring Boot joue le rôle d'intermédiaire sécurisé entre l'interface utilisateur et le service IA.

## Organisation principale du projet

Les dossiers principaux sont :

- `app/` : code applicatif FastAPI ;
- `app/api/` : endpoints REST ;
- `app/services/` : logique métier IA ;
- `app/schemas/` : modèles de requête et réponse ;
- `app/core/` : configuration, sécurité et registry ;
- `app/data/` : accès aux données et repositories ;
- `datasets/` : données raw, clean, processed et rapports ;
- `training/` : scripts d'entraînement et d'évaluation ;
- `models_artifacts/` : modèles entraînés et métadonnées ;
- `reports/` : rapports d'audit, de comparaison et de décision ;
- `docs/ai/` : documentation technique IA ;
- `scripts/` : scripts de validation, audit et maintenance.

## Sécurité

Le service IA est protégé par une clé interne.

Chaque endpoint sensible utilise l'en-tête :

`x-ai-service-key`

Cette clé est configurée dans l'environnement local du service IA.

Elle ne doit jamais être exposée dans Angular.

## Diagnostic global

Le service expose un endpoint de diagnostic permettant de vérifier :

- la disponibilité de PostgreSQL ;
- la disponibilité du model registry ;
- la version active du modèle de recommandation ;
- la disponibilité des features ;
- les compteurs runtime ;
- la disponibilité d'Ollama ;
- les modèles actifs.

Endpoint :

`GET /ai/diagnostics/status`

La réponse attendue doit indiquer :

- `status = UP` ;
- `database_available = true` ;
- `model_registry_available = true` ;
- `active_models = recommendation, planning`.

## Module 1 — Recommandation IA

### Objectif

Le module de recommandation propose des événements personnalisés pour chaque employé.

Il classe les événements candidats selon leur pertinence pour un utilisateur donné.

### Endpoint principal

`GET /ai/recommendations/users/{user_id}?limit=5`

### Modèle utilisé

Le modèle actif est :

`recommendation-v1.0.0`

Type de modèle :

`CatBoostRanker`

Statut :

`production`

### Fonctionnement général

Le service :

- récupère l'utilisateur ;
- récupère les événements candidats ;
- construit les features utilisateur-événement ;
- charge le modèle actif depuis le model registry ;
- applique le scoring CatBoostRanker ;
- trie les événements par score ;
- retourne les recommandations avec des raisons lisibles.

### Données utilisées

Le modèle utilise notamment :

- utilisateurs ;
- départements ;
- événements ;
- inscriptions ;
- présences ;
- feedbacks ;
- invitations ;
- intérêts ;
- points ;
- badges.

### Features principales

Les principales features sont :

- catégorie de l'événement ;
- audience ;
- type de lieu ;
- capacité ;
- durée ;
- jour de la semaine ;
- heure ;
- nombre de jours avant l'événement ;
- taux de remplissage ;
- note moyenne ;
- correspondance département ;
- correspondance intérêt ;
- historique utilisateur ;
- points ;
- badges ;
- invitations et RSVP.

### Décision de modèle

La version conservée en production est `recommendation-v1.0.0`.

Les versions candidates `v1.3.0`, `v1.4.0` et `v1.5.0` ont été testées mais non promues.

Raison :

- `v1.0.0` garde le meilleur équilibre sur `Precision@5` et `NDCG@5` ;
- les candidates plus récentes n'ont pas dépassé la version de production ;
- `Recall@5` n'était pas mesuré dans la version initiale et reste indiqué comme non mesuré.

### Règle de promotion future

Une nouvelle version peut remplacer `recommendation-v1.0.0` uniquement si :

- `NDCG@5` est supérieur à `0.8623` ;
- `Precision@5` est supérieur ou égal à `0.7290` ;
- le split de validation est comparable ;
- la fiche modèle est mise à jour ;
- la promotion passe par le model registry.

## Module 2 — Planning Intelligent

### Objectif

Le module Planning Intelligent aide les RH et managers à choisir les meilleurs créneaux pour organiser des événements.

Il propose aussi des idées d'événements en combinant :

- historique de participation ;
- règles métier ;
- contraintes calendrier ;
- modèle de scoring ;
- génération assistée par LLM.

### Endpoints principaux

Suggestions de créneaux :

`POST /ai/planning/suggestions`

Propositions d'événements :

`POST /ai/planning/event-proposals`

Monitoring Planning :

`GET /ai/planning/monitoring/summary`

### Modèle utilisé

Le modèle actif est :

`planning-regressor-v1.0.0`

Type de modèle :

`CatBoostRegressor`

Statut :

`production`

### Fonctionnement général

Le service :

- génère des créneaux candidats ;
- calcule les features de contexte ;
- applique le modèle CatBoostRegressor ;
- combine le score avec des règles métier ;
- pénalise les conflits ;
- retourne les meilleurs créneaux.

### Métriques principales

Le modèle est meilleur que les baselines.

Métriques principales :

- MAE : `0.0788` ;
- RMSE : `0.1060` ;
- R² : `0.0344`.

Le R² reste faible, donc le modèle est présenté comme un composant de scoring hybride et non comme une décision automatique.

### Décision de modèle

`planning-regressor-v1.0.0` reste en production.

Raison :

- il est meilleur que les baselines ;
- il est utilisé avec des règles métier ;
- il aide à classer les créneaux ;
- la décision finale reste sous contrôle RH.

## Module 3 — Feedback Intelligence

### Objectif

Le module Feedback Intelligence analyse les retours utilisateurs après les événements.

Il permet de produire :

- un sentiment global ;
- une distribution positive, neutre et négative ;
- des thèmes principaux ;
- des mots-clés ;
- des points forts ;
- des axes d'amélioration ;
- un résumé RH.

### Endpoint principal

`GET /ai/feedback/events/{event_id}/insights`

### Techniques utilisées

Le module utilise :

- un modèle de sentiment multilingue ;
- SentenceTransformer pour les embeddings ;
- BERTopic pour les thèmes ;
- Qwen via Ollama pour le résumé final ;
- un fallback template si le LLM n'est pas disponible.

### Données utilisées

Le module lit les feedbacks depuis PostgreSQL :

- événement ;
- note ;
- commentaire ;
- date de création.

### Sécurité et robustesse

Le module ne doit pas inventer de données.

Le résumé LLM doit respecter :

- le nombre exact de feedbacks ;
- la note moyenne ;
- la distribution des sentiments ;
- les thèmes détectés ;
- les points forts ;
- les axes d'amélioration.

Si Qwen échoue, le service retourne un résumé template.

## Module 4 — HR Copilot

### Objectif

Le Copilote RH propose des actions opérationnelles aux RH.

Il détecte automatiquement :

- les invitations en attente ;
- les événements avec faible inscription ;
- les événements avec feedback faible ;
- les départements peu engagés ;
- les frictions RSVP.

### Endpoints principaux

Suggestions RH :

`GET /ai/hr-copilot/suggestions`

Feedback utilisateur sur une suggestion :

`POST /ai/hr-copilot/feedback`

Monitoring Copilot :

`GET /ai/monitoring/hr-copilot/summary`

### Fonctionnement général

Le service :

- exécute des règles métier sur PostgreSQL ;
- classe les suggestions par priorité ;
- génère un brouillon RH avec Qwen si disponible ;
- utilise un fallback si Qwen échoue ;
- journalise les appels dans les logs locaux ;
- expose un monitoring d'usage.

### Exemples de suggestions

Le Copilote RH peut proposer :

- relancer les invités sans réponse ;
- améliorer le taux d'inscription ;
- analyser des feedbacks négatifs ;
- renforcer l'engagement d'un département ;
- comprendre les réponses négatives ou hésitantes.

### Nettoyage des textes

Les réponses runtime sont nettoyées via :

`app/core/text_sanitizer.py`

Ce nettoyage évite les caractères cassés dans Swagger, Angular et les réponses JSON.

## Données

### Datasets raw

Les exports initiaux sont stockés dans :

`datasets/raw/capevents/`

Ils servent de source brute.

### Datasets clean

Les données nettoyées sont stockées dans :

`datasets/clean/capevents_v1/`

Cette version est validée par le script :

`python scripts/validate_clean_csv.py`

### Datasets processed

Les datasets prêts pour l'entraînement sont stockés dans :

`datasets/processed/`

Exemples :

- `recommendation_train.csv` ;
- `recommendation_train_hard_negatives.csv` ;
- `planning_train.csv`.

### Datasets rejected

Les lignes rejetées sont conservées dans :

`datasets/rejected/capevents_v1/`

Cela permet de garder une traçabilité du nettoyage.

## Model registry

Le fichier central est :

`models_artifacts/model_registry.json`

Il contient :

- les tâches IA ;
- les versions ;
- les chemins des artefacts ;
- les chemins des features ;
- les métriques ;
- le statut de chaque version ;
- la version active.

Les statuts utilisés sont :

- `production` ;
- `candidate` ;
- `rejected` ;
- `archived`.

## Monitoring

Le service contient plusieurs mécanismes de monitoring :

- monitoring des prédictions ;
- monitoring Planning ;
- monitoring Copilot RH ;
- logs JSONL locaux ;
- endpoints de résumé.

Les logs runtime sont conservés localement dans :

- `logs/copilot/` ;
- `logs/predictions/`.

Ces dossiers sont ignorés par Git.

## Nettoyage et validation

Les validations principales sont :

```bash
python scripts/validate_clean_csv.py
python scripts/audit_markdown_french_v1.py
python -m compileall app scripts training
```

Résultats attendus :

- aucune erreur bloquante dans les CSV ;
- aucun fichier Markdown à corriger ;
- aucune erreur de compilation Python.

## Fichiers Markdown

Tous les fichiers `.md` doivent être en français.

L'audit Markdown vérifie :

- les textes anglais résiduels ;
- les caractères cassés ;
- les fichiers vides.

Rapport généré :

`reports/markdown_french_audit_v1.md`

## Fichiers ignorés par Git

Les fichiers suivants ne doivent pas être versionnés :

- `.env` ;
- `.venv/` ;
- `logs/` ;
- `catboost_info/` ;
- `tmp/` ;
- backups temporaires de nettoyage.

## Limites actuelles

Les limites principales sont :

- certains jeux de données restent partiellement synthétiques ou démonstratifs ;
- les historiques réels restent limités ;
- les modèles dépendent fortement de la qualité des données ;
- les nouveaux utilisateurs peuvent avoir peu de signaux ;
- le Planning reste un scoring hybride, pas une décision automatique ;
- les résumés LLM doivent rester contrôlés par des règles de validation.

## Améliorations futures

Les améliorations recommandées sont :

- augmenter les données réelles historiques ;
- enrichir les feedbacks ;
- améliorer les hard negatives de la recommandation ;
- ajouter une validation temporelle ;
- comparer CatBoost avec LightGBM ;
- ajouter des embeddings textuels pour les descriptions d'événements ;
- améliorer le cold-start ;
- centraliser davantage l'accès PostgreSQL dans les repositories ;
- ajouter plus de tests automatisés ;
- documenter chaque endpoint dans Swagger avec des exemples.

## Conclusion

La partie IA de CapEvents est organisée autour de quatre modules :

- Recommandation IA ;
- Planning Intelligent ;
- Feedback Intelligence ;
- HR Copilot.

Les modules Recommandation et Planning utilisent des modèles entraînés et suivis dans le model registry.

Les modules Feedback et Copilot combinent NLP, règles métier, LLM et fallback sécurisé.

L'ensemble forme une architecture IA modulaire, explicable et adaptée à un projet PFE propre.
