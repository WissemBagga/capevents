# Stratégie de réentraînement — Recommandation IA CapEvents

## Objectif

Ce document décrit la stratégie de réentraînement du modèle de recommandation IA de CapEvents.

Le module de recommandation propose à chaque employé des événements personnalisés selon :

- son profil ;
- son département ;
- ses centres d’intérêt ;
- son historique d’inscription ;
- ses présences ;
- ses feedbacks ;
- ses points ;
- ses badges ;
- ses invitations ;
- les caractéristiques des événements.

## Modèle utilisé

Le modèle utilisé est :

- Algorithme : CatBoostRanker
- Type : Learning to Rank
- Tâche : classer les événements candidats pour un utilisateur donné
- Sortie : score de pertinence pour chaque paire utilisateur-événement

Le modèle prédit un score, puis le service applique des règles métier pour éviter de recommander :

- un événement déjà rejoint ;
- un événement complet ;
- un événement dont la deadline est dépassée ;
- un événement non publié.

## Version actuellement en production

La version conservée en production est :

`recommendation-v1.0.0`

Cette version reste la meilleure selon les métriques principales disponibles.

| Version | Precision@5 | Recall@5 | NDCG@5 | Décision |
|---|---:|---:|---:|---|
| recommendation-v1.0.0 | 0.7290 | Non mesuré | 0.8623 | Conservée en production |
| recommendation-v1.3.0 | 0.7210 | 0.7233 | 0.8564 | Non promue |
| recommendation-v1.4.0 | 0.6850 | 0.7085 | 0.8237 | Non promue |
| recommendation-v1.5.0 | 0.6980 | 0.7087 | 0.8309 | Non promue |

## Pourquoi v1.0.0 reste en production

La version `recommendation-v1.0.0` reste la meilleure sur les deux métriques principales :

- Precision@5 ;
- NDCG@5.

Les versions `v1.3.0`, `v1.4.0` et `v1.5.0` ont été testées, mais elles n’ont pas amélioré les performances.

La décision est donc de garder `recommendation-v1.0.0` en production.

## Note sur Recall@5

`Recall@5` n’était pas calculé dans le pipeline initial de `recommendation-v1.0.0`.

La valeur reste donc indiquée comme `Non mesuré`.

Elle ne doit pas être inventée ni ajoutée manuellement.

## Expérimentations réalisées

### recommendation-v1.3.0

Cette version utilise un dataset reconstruit avec davantage d’exemples négatifs.

Résultat :

- Precision@5 légèrement inférieure ;
- NDCG@5 légèrement inférieur ;
- Recall@5 disponible.

Décision : non promue.

### recommendation-v1.4.0

Cette version teste un autre équilibre dans l’échantillonnage négatif.

Résultat :

- baisse de Precision@5 ;
- baisse de NDCG@5.

Décision : non promue.

### recommendation-v1.5.0

Cette version ajoute des hard negatives :

- utilisateurs invités mais non inscrits ;
- utilisateurs du même département mais n’ayant pas participé ;
- invitations avec RSVP négatif ou expiré.

Résultat :

- amélioration par rapport à v1.4.0 ;
- mais performances encore inférieures à v1.0.0 et v1.3.0.

Décision : non promue.

## Pourquoi les hard negatives n’ont pas encore amélioré le modèle

Les hard negatives sont utiles, mais ils doivent être bien équilibrés.

Dans `v1.5.0`, leur ajout a probablement introduit trop de signaux négatifs par rapport aux signaux positifs.

Le modèle apprend donc davantage à pénaliser certains événements qu’à mieux classer les meilleurs candidats.

Pour améliorer cette approche, il faudra :

- réduire le poids des hard negatives ;
- mieux distinguer les types de négatifs ;
- éviter d’ajouter trop de négatifs similaires ;
- tester plusieurs ratios ;
- comparer les métriques sur un split identique.

## Règle de promotion d’une nouvelle version

Une nouvelle version peut remplacer `recommendation-v1.0.0` uniquement si :

- `NDCG@5` est supérieur à `0.8623` ;
- `Precision@5` est supérieur ou égal à `0.7290` ;
- le modèle est évalué sur un split comparable ;
- la model card est mise à jour ;
- le modèle est enregistré dans le model registry ;
- la promotion est faite avec la commande officielle.

Commande de promotion :

```bash
python -m training.promote_model --task recommendation --version <version>
```

## Pipeline recommandé

Le pipeline de réentraînement est :

```bash
python -m training.build_recommendation_dataset
python -m training.audit_recommendation_dataset
python -m training.train_recommendation_model --version recommendation-vX.Y.Z
python scripts/compare_recommendation_versions.py
```

La promotion ne doit être faite qu’après comparaison des métriques.

## Fichiers concernés

Les principaux fichiers concernés sont :

- `training/build_recommendation_dataset.py`
- `training/train_recommendation_model.py`
- `training/audit_recommendation_dataset.py`
- `training/model_registry.py`
- `training/promote_model.py`
- `configs/recommendation_dataset_config.json`
- `configs/recommendation_model_config.json`
- `models_artifacts/model_registry.json`
- `models_artifacts/recommendation/model_card.md`
- `reports/recommendation/recommendation_versions_comparison.json`

## Statut actuel

- Modèle actif : `recommendation-v1.0.0`
- Statut : production
- Dernière candidate testée : `recommendation-v1.5.0`
- Décision : ne pas promouvoir les candidates récentes
- Prochaine amélioration : améliorer l’équilibre des hard negatives et enrichir la base historique

## Conclusion

Le module de recommandation est opérationnel avec une vraie approche IA basée sur un modèle de ranking.

La version `recommendation-v1.0.0` reste la version de production, car elle obtient les meilleures performances mesurées sur les métriques principales.

Les versions candidates `v1.3.0`, `v1.4.0` et `v1.5.0` sont conservées comme traces d’expérimentation, mais elles ne doivent pas être promues tant qu’elles ne dépassent pas la version de production.
