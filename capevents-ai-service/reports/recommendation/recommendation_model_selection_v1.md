@'
# Sélection du modèle de recommandation — CapEvents AI

## Décision

Le modèle de recommandation conservé en production est :

`recommendation-v1.0.0`

## Raison

Les nouvelles versions candidates n'ont pas dépassé le modèle de production sur les métriques principales de ranking.

| Version | Precision@5 | Recall@5 | NDCG@5 | Décision |
|---|---:|---:|---:|---|
| recommendation-v1.0.0 | 0.7290 | Non mesuré | 0.8623 | Conservé en production |
| recommendation-v1.3.0 | 0.7210 | 0.7233 | 0.8564 | Non promu |
| recommendation-v1.4.0 | 0.6850 | 0.7085 | 0.8237 | Non promu |
| recommendation-v1.5.0 | 0.6980 | 0.7087 | 0.8309 | Non promu |

## Interprétation

`recommendation-v1.0.0` reste le meilleur modèle selon les métriques `Precision@5` et `NDCG@5`.

Les versions candidates plus récentes ont introduit des jeux de données plus propres, un nouvel échantillonnage négatif et des hard negatives, mais elles ont réduit la qualité du classement sur le jeu de validation.

## Note sur Recall@5

`Recall@5` n'est pas disponible pour `recommendation-v1.0.0`, car le pipeline d'évaluation initial ne calculait pas encore cette métrique.

Par honnêteté scientifique, cette valeur reste indiquée comme `Non mesuré` au lieu d'être estimée ou ajoutée manuellement.

## Règle de mise en production

Une nouvelle version peut remplacer `recommendation-v1.0.0` uniquement si :

- `NDCG@5` est supérieur à `0.8623` ;
- `Precision@5` est supérieur ou égal à `0.7290` ;
- le modèle est évalué sur un split de validation comparable ;
- la model card est mise à jour ;
- la promotion est faite via le model registry.

## Modèle actuellement en production

- Tâche : recommandation
- Modèle : CatBoostRanker
- Version active : recommendation-v1.0.0
- Statut : production

## Candidates conservées pour traçabilité

- recommendation-v1.3.0
- recommendation-v1.4.0
- recommendation-v1.5.0

Ces candidates sont conservées comme expérimentations et ne doivent pas être promues sans amélioration mesurable.
'@ | Set-Content reports/recommendation/recommendation_model_selection_v1.md -Encoding utf8