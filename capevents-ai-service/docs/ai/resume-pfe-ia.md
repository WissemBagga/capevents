# Résumé de la partie IA — CapEvents

## Présentation générale

La partie intelligence artificielle de CapEvents vise à améliorer l’expérience des employés, des managers et des RH grâce à plusieurs modules intelligents intégrés au système.

Le service IA est développé avec FastAPI et fonctionne comme un microservice séparé. Il est appelé par le backend Spring Boot, qui sert d’intermédiaire sécurisé entre l’interface Angular et les traitements IA.

Le flux applicatif retenu est :

```text
Angular → Spring Boot → FastAPI IA → PostgreSQL / modèles IA
```

Cette architecture permet de séparer clairement l’interface utilisateur, la logique métier principale, les traitements IA, les modèles entraînés et les données utilisées pour l’entraînement ou le monitoring.

## Modules IA développés

La partie IA est organisée autour de quatre modules principaux :

- recommandation personnalisée d’événements ;
- planning intelligent ;
- feedback intelligence ;
- HR Copilot.

## 1. Recommandation personnalisée d’événements

Le module de recommandation propose à chaque employé une liste personnalisée d’événements.

Il utilise un modèle de ranking basé sur `CatBoostRanker`. Ce modèle classe les événements candidats selon leur pertinence pour un utilisateur donné.

Les principaux signaux utilisés sont :

- le profil de l’utilisateur ;
- son département ;
- ses centres d’intérêt ;
- son historique d’inscription ;
- son historique de présence ;
- ses feedbacks ;
- ses invitations ;
- ses points et badges ;
- les caractéristiques des événements.

La version actuellement retenue en production est :

```text
recommendation-v1.0.0
```

Cette version a été conservée car elle présente les meilleures performances parmi les versions testées. Les versions candidates `v1.3.0`, `v1.4.0` et `v1.5.0` ont été entraînées et comparées, mais elles n’ont pas dépassé la version de production.

## 2. Planning Intelligent

Le module Planning Intelligent aide les RH et les managers à choisir les meilleurs créneaux pour organiser des événements.

Il utilise un modèle de régression basé sur `CatBoostRegressor`.

La version active est :

```text
planning-regressor-v1.0.0
```

Ce modèle prédit un score de succès attendu pour un créneau d’événement. Le score final est utilisé dans une approche hybride :

```text
modèle IA + règles métier + contraintes calendrier + validation RH
```

Le modèle est meilleur que les baselines, mais son R² reste faible. Il est donc utilisé comme aide au classement et non comme décision automatique.

## 3. Feedback Intelligence

Le module Feedback Intelligence analyse les retours utilisateurs après les événements.

Il permet de produire :

- un sentiment global ;
- une distribution positive, neutre et négative ;
- des thèmes principaux ;
- des mots-clés ;
- des points forts ;
- des axes d’amélioration ;
- un résumé RH.

Ce module combine un modèle de sentiment multilingue, des embeddings avec `SentenceTransformer`, `BERTopic` pour l’extraction de thèmes, et Qwen via Ollama pour la génération du résumé final. Si le LLM n’est pas disponible, un résumé de secours est généré.

## 4. HR Copilot

Le Copilote RH propose automatiquement des actions opérationnelles aux responsables RH.

Il détecte notamment :

- les invitations en attente ;
- les événements avec faible taux d’inscription ;
- les événements avec feedback faible ;
- les départements peu engagés ;
- les frictions RSVP.

Le module génère ensuite des suggestions RH avec un brouillon de message professionnel. Il utilise une approche hybride :

```text
règles SQL + logique métier + génération LLM + fallback sécurisé
```

## Données utilisées

Les données IA sont organisées selon plusieurs niveaux :

- `datasets/raw/capevents/` : exports bruts ;
- `datasets/clean/capevents_v1/` : données nettoyées ;
- `datasets/processed/` : datasets utilisés pour l’entraînement ;
- `datasets/rejected/capevents_v1/` : lignes rejetées pendant le nettoyage ;
- `datasets/reports/` : rapports de validation et de qualité.

Cette organisation permet de garder une traçabilité complète entre les données brutes, les données nettoyées, les datasets d’entraînement et les rapports produits.

## Nettoyage des données

Un nettoyage global des données a été réalisé avant l’entraînement et la validation des modèles.

Les contrôles effectués incluent :

- la présence des fichiers attendus ;
- la cohérence des colonnes ;
- la validation des relations entre tables ;
- la suppression des auto-invitations ;
- la correction des warnings ;
- la génération de rapports de qualité ;
- la conservation des lignes rejetées.

Le script principal de validation est :

```bash
python scripts/validate_clean_csv.py
```

Le rapport de qualité est généré dans :

```text
datasets/reports/data_quality_report_v1.md
```

## Suivi des modèles

Les modèles IA sont suivis dans un registre central :

```text
models_artifacts/model_registry.json
```

Ce registre contient les versions des modèles, leur statut, les chemins des artefacts, les features utilisées, les métriques et la version active en production.

Les statuts utilisés sont :

- production ;
- candidate ;
- rejected ;
- archived.

## Sécurité

Le service IA est protégé par une clé interne transmise via l’en-tête :

```text
x-ai-service-key
```

Cette clé est utilisée uniquement entre Spring Boot et FastAPI IA. Elle ne doit jamais être exposée dans Angular.

## Monitoring

Des mécanismes de monitoring permettent de suivre :

- les prédictions ;
- les suggestions du Planning Intelligent ;
- les appels du Copilote RH ;
- l’utilisation de Qwen ;
- les feedbacks utilisateurs sur les suggestions.

Les logs runtime sont stockés localement dans :

- `logs/copilot/`
- `logs/predictions/`

Ces dossiers sont ignorés par Git.

## Validation finale

La validation finale de la partie IA repose sur plusieurs contrôles :

```bash
python scripts/validate_clean_csv.py
python scripts/audit_markdown_french_v1.py
python -m compileall app scripts training
```

Les résultats attendus sont :

- zéro erreur bloquante dans les CSV ;
- zéro fichier Markdown à corriger ;
- aucune erreur de compilation Python ;
- diagnostic FastAPI avec le statut `UP`.

## Limites

Les principales limites actuelles sont :

- les données historiques restent limitées ;
- certains datasets sont encore partiellement démonstratifs ;
- le cold-start est possible pour les nouveaux utilisateurs ;
- la qualité des résultats dépend fortement des feedbacks disponibles ;
- le Planning Intelligent reste une aide au scoring et non une décision automatique ;
- les réponses générées par LLM doivent rester contrôlées.

## Améliorations futures

Les améliorations possibles sont :

- collecter plus de données réelles ;
- enrichir les historiques d’inscription et de présence ;
- améliorer les hard negatives pour la recommandation ;
- ajouter une validation temporelle ;
- comparer CatBoost avec LightGBM ;
- ajouter des embeddings textuels ;
- renforcer les tests automatisés ;
- améliorer le cold-start ;
- centraliser davantage les accès PostgreSQL via repositories.

## Conclusion

La partie IA de CapEvents est structurée, modulaire et documentée.

Elle combine des modèles de machine learning, des règles métier, du NLP, un LLM local via Ollama, du monitoring, de la validation de données et une documentation technique.

Cette approche permet d’obtenir une solution IA réaliste, explicable et adaptée au contexte d’un projet PFE.
