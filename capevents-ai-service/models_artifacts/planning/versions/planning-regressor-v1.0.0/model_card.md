@'
# Fiche modèle — Planning Intelligent v1.0.0

## Modèle

Le modèle `planning-regressor-v1.0.0` est un modèle de régression basé sur `CatBoostRegressor`.

Il est utilisé dans le module Planning Intelligent pour estimer le potentiel d'un créneau d'événement.

## Objectif métier

L'objectif du modèle est d'aider les RH et les managers à choisir des créneaux pertinents pour organiser des événements internes.

Le modèle ne crée pas automatiquement un événement.  
Il fournit un score d'aide à la décision, combiné avec des règles métier et une validation humaine.

## Type de modèle

- Famille : régression supervisée
- Algorithme : CatBoostRegressor
- Tâche : prédiction d'un score de succès attendu
- Target : `success_score`
- Version : `planning-regressor-v1.0.0`
- Statut : production

## Source des données

Dataset utilisé :

`datasets/processed/planning_train.csv`

Le dataset contient des événements enrichis avec :

- informations événement ;
- catégorie ;
- audience ;
- type de lieu ;
- capacité ;
- durée ;
- jour et heure ;
- taille du département ;
- conflits calendrier ;
- taux historiques d'inscription ;
- taux historiques de présence ;
- signaux de participation par catégorie, département, jour et heure.

## Features utilisées

Le modèle utilise notamment :

- `event_category`
- `event_audience`
- `event_location_type`
- `target_department_id`
- `capacity`
- `duration_minutes`
- `day_of_week`
- `hour`
- `month`
- `is_morning`
- `is_afternoon`
- `is_afterwork`
- `department_size`
- `events_same_day_count`
- `events_same_department_same_week_count`
- `historical_category_registration_rate`
- `historical_category_attendance_rate`
- `historical_department_participation_rate`
- `historical_hour_registration_rate`
- `historical_day_registration_rate`

## Métriques

| Métrique | Valeur |
|---|---:|
| Lignes d'entraînement | 547 |
| Lignes de validation | 137 |
| MAE | 0.0788 |
| MSE | 0.0112 |
| RMSE | 0.1060 |
| R² | 0.0344 |

## Comparaison avec les baselines

| Modèle | MAE | RMSE | R² |
|---|---:|---:|---:|
| CatBoostRegressor | 0.0788 | 0.1060 | 0.0344 |
| Baseline moyenne | 0.1013 | 0.1127 | -0.0915 |
| Baseline catégorie | 0.0999 | 0.1135 | -0.1069 |

## Décision

Le modèle est conservé en production car il est meilleur que les baselines sur les métriques principales.

Cependant, le R² reste faible.  
Le modèle ne doit donc pas être présenté comme une prédiction totalement autonome.

Il doit être présenté comme un composant de scoring dans une approche hybride :

`CatBoostRegressor + règles métier + contraintes calendrier + validation RH`

## Utilisation au runtime

Au runtime, le service Planning Intelligent combine :

- prédiction du modèle CatBoostRegressor ;
- score historique ;
- préférences horaires ;
- pénalités de conflit ;
- diversité des créneaux ;
- règles métier.

Le score affiché représente un potentiel relatif, pas une probabilité stricte de succès.

## Limites

Les limites principales sont :

- dataset encore limité ;
- peu d'exemples avec succès élevé ;
- distribution déséquilibrée des labels ;
- score dépendant des données historiques disponibles ;
- besoin de validation humaine avant création d'un événement ;
- modèle plus fiable comme aide au classement que comme prédicteur absolu.

## Améliorations futures

Les prochaines améliorations possibles sont :

- augmenter le volume de vrais événements historiques ;
- améliorer la qualité des feedbacks ;
- ajouter plus de cas de succès moyen et élevé ;
- tester une validation temporelle ;
- comparer avec LightGBM Regressor ;
- ajouter des features de saisonnalité ;
- ajouter des signaux de disponibilité collaborateurs ;
- recalculer les métriques après chaque réentraînement.

## Statut final

- Version : `planning-regressor-v1.0.0`
- Statut : production
- Décision : conservé
- Usage recommandé : scoring hybride assisté par IA
'@ | Set-Content models_artifacts/planning/versions/planning-regressor-v1.0.0/model_card.md -Encoding utf8
