# Stratégie de réentraînement — IA 1 Recommandation

## Principe

Le modèle de recommandation ne doit pas être remplacé automatiquement après entraînement.

Le cycle professionnel est :

1. construire un snapshot dataset ;
2. auditer la qualité des données ;
3. entraîner une version candidate ;
4. évaluer les métriques ;
5. comparer avec le modèle production ;
6. promouvoir seulement si la candidate est meilleure.

## Version actuelle

`recommendation-v1.0.0` est la version production initiale.

Elle est basée sur un dataset enrichi composé de :

- exports CapEvents ;
- données synthétiques cohérentes ;
- données externes curated si présentes.

## Version v1.1.0

La version `recommendation-v1.1.0` sera pertinente uniquement si de nouveaux signaux sont disponibles en volume suffisant.

Signaux prévus :

- was_reminded ;
- pair_reminder_count ;
- days_since_last_reminder ;
- user_total_reminders_received ;
- event_total_reminders_sent.

## Décision actuelle

Les colonnes de relance peuvent être préparées dans le pipeline, mais la version v1.1.0 ne doit pas être promue si le nombre de relances est trop faible.

Le fichier d’audit utilisé est :

`reports/recommendation_dataset_audit.json`

## Règle

Train ≠ Deploy.

Une version candidate n’est promue en production que si elle améliore clairement les métriques de validation.