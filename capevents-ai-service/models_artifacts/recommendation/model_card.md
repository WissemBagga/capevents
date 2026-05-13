# Fiche modèle — Recommendation v1.0.0

## Modèle

CatBoostRanker pour la recommandation personnalisée d’événements CapEvents.

## Objectif

Classer les événements publiés selon leur pertinence pour un utilisateur donné.

## Données utilisées

- utilisateurs
- événements
- inscriptions
- présences
- feedbacks
- invitations
- intérêts
- points
- badges

## Source runtime

PostgreSQL CapEvents.

## Limites

- Le modèle dépend de la qualité des données historiques.
- Les nouveaux utilisateurs peuvent avoir moins de signaux comportementaux.
- Les décisions finales restent encadrées par des règles métier.

## Statut

Version initiale enregistrée comme modèle production.

