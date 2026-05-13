# Model Card — recommendation-v1.5.0

## Modèle

CatBoostRanker pour la recommandation personnalisée d’événements CapEvents.

## Objectif

Classer les événements publiés selon leur pertinence pour un utilisateur donné.

## Statut

Candidate.

## Données utilisées

Source training : dataset recommendation_train.csv construit à partir d’exports CapEvents enrichis, de données synthétiques cohérentes et, si disponible, de données externes curated.

Source runtime : PostgreSQL CapEvents.

## Taille dataset

- Training rows : 28081
- Validation rows : 6773

## Métriques

{
  "version": "recommendation-v1.5.0",
  "model_type": "CatBoostRanker",
  "status": "candidate",
  "input_file": "datasets\\processed\\recommendation_train_hard_negatives.csv",
  "rows_total": 34854,
  "rows_train": 28081,
  "rows_validation": 6773,
  "users_train": 800,
  "users_validation": 200,
  "events_total": 1000,
  "features": [
    "event_category",
    "event_audience",
    "event_location_type",
    "event_status",
    "event_capacity",
    "event_duration_minutes",
    "event_day_of_week",
    "event_hour",
    "days_until_event",
    "event_registered_count",
    "event_present_count",
    "event_fill_rate",
    "event_avg_rating",
    "event_feedback_count",
    "same_department",
    "is_global_event",
    "interest_match",
    "user_total_registrations",
    "user_total_attendances",
    "user_attendance_rate",
    "user_avg_rating",
    "user_category_registrations",
    "user_category_attendances",
    "user_category_attendance_rate",
    "points_total",
    "points_events_count",
    "badges_count",
    "was_invited",
    "rsvp_yes",
    "rsvp_maybe",
    "rsvp_no",
    "was_reminded",
    "pair_reminder_count",
    "days_since_last_reminder",
    "user_total_reminders_received",
    "event_total_reminders_sent"
  ],
  "categorical_features": [
    "event_category",
    "event_audience",
    "event_location_type",
    "event_status"
  ],
  "metrics": {
    "precision_at_5": 0.698,
    "recall_at_5": 0.7087002164502164,
    "ndcg_at_5": 0.8309408390642868,
    "evaluated_users": 200,
    "evaluated_rows": 6773
  },
  "catboost_best_score": {}
}

## Règle de déploiement

Cette version candidate ne doit pas être utilisée en production tant qu’elle n’a pas été promue avec :

python -m training.promote_model --task recommendation --version recommendation-v1.5.0

## Limites

- Les performances dépendent de la qualité des historiques d’inscription, présence, invitation et feedback.
- Le cold-start reste possible pour les nouveaux utilisateurs.
- Le modèle ne remplace pas les règles métier de disponibilité, capacité et deadline.
