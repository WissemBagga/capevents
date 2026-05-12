# Model Card — Planning Regressor planning-regressor-v1.0.0

## Modèle

CatBoostRegressor pour IA 4 Planning Intelligent.

## Objectif

Prédire un score de succès attendu pour un créneau d’événement.

## Target

success_score

Le score combine principalement :

- taux d’inscription ;
- taux de présence ;
- satisfaction moyenne.

## Données utilisées

Dataset : datasets/processed/planning_train.csv

## Statut

Version candidate.

Elle ne doit être promue en production qu’après validation des métriques.

## Métriques

{
  "train_rows": 547,
  "valid_rows": 137,
  "mae": 0.0788105062465858,
  "mse": 0.01122908151431812,
  "rmse": 0.10596736060843509,
  "r2": 0.03444210720464991
}

## Limites

- Dataset encore enrichi/synthétique.
- Les signaux HIGH sont rares.
- Le modèle prédit un potentiel, il ne crée pas automatiquement l’événement.
- Le score final doit rester validé par un RH ou un manager.
