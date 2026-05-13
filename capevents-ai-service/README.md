@'
# CapEvents AI Service

## Présentation

Ce service contient la partie intelligence artificielle du projet CapEvents.

Il fournit plusieurs modules IA utilisés par l'application principale :

- recommandation personnalisée d'événements ;
- analyse des feedbacks ;
- copilot RH ;
- planning intelligent ;
- monitoring des prédictions ;
- diagnostics techniques.

## Architecture générale

Le service IA fonctionne comme un service indépendant basé sur FastAPI.

Flux applicatif recommandé :

Angular → Spring Boot → FastAPI IA → PostgreSQL / modèles IA

Le frontend Angular ne doit pas appeler directement le service IA.

## Modules principaux

### Recommandation

Le module de recommandation utilise un modèle CatBoostRanker.

Il classe les événements candidats selon leur pertinence pour un utilisateur donné.

### Planning Intelligent

Le module Planning Intelligent utilise un modèle CatBoostRegressor combiné avec des règles métier.

Il propose des créneaux pertinents et aide à générer des propositions d'événements.

### Feedback Intelligence

Le module Feedback Intelligence analyse les retours utilisateurs afin d'aider les RH à comprendre les tendances et les points d'amélioration.

### Copilot RH

Le Copilot RH aide à produire des suggestions exploitables à partir des données internes disponibles.

## Données

Les données sont organisées en plusieurs dossiers :

- datasets/raw/ : exports d'origine ;
- datasets/clean/ : données nettoyées ;
- datasets/processed/ : datasets prêts pour l'entraînement ;
- datasets/rejected/ : lignes rejetées pendant le nettoyage ;
- datasets/reports/ : rapports de validation et de qualité.

## Modèles

Les modèles entraînés sont stockés dans :

models_artifacts/

Le fichier central de suivi des versions est :

models_artifacts/model_registry.json

## Sécurité

Le service IA est protégé par une clé interne :

x-ai-service-key

Cette clé doit être utilisée uniquement par le backend Spring Boot.

Elle ne doit jamais être exposée dans Angular.

## Lancement local

Depuis le dossier capevents-ai-service :

uvicorn app.main:app --reload --port 8001

## Statut

Version de nettoyage IA en cours de stabilisation pour le PFE CapEvents.
'@ | Set-Content README.md -Encoding utf8