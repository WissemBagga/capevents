@'
# Décision du modèle Planning Intelligent — CapEvents AI

## Décision

Le modèle conservé en production est :

`planning-regressor-v1.0.0`

## Résumé

Le modèle Planning est un `CatBoostRegressor` utilisé pour estimer le potentiel d'un créneau d'événement.

Il est utilisé dans une approche hybride :

`modèle IA + règles métier + contraintes calendrier + validation RH`

## Métriques principales

| Métrique | Valeur |
|---|---:|
| MAE | 0.0788 |
| RMSE | 0.1060 |
| R² | 0.0344 |
| Lignes d'entraînement | 547 |
| Lignes de validation | 137 |

## Comparaison aux baselines

| Modèle | MAE | RMSE | R² |
|---|---:|---:|---:|
| CatBoostRegressor | 0.0788 | 0.1060 | 0.0344 |
| Baseline moyenne | 0.1013 | 0.1127 | -0.0915 |
| Baseline catégorie | 0.0999 | 0.1135 | -0.1069 |

## Interprétation

Le modèle CatBoost est meilleur que les baselines.  
Il apporte donc une valeur réelle au module Planning.

Cependant, le R² reste faible.  
Cela signifie que le modèle ne doit pas être utilisé seul comme décision automatique.

## Statut

Le modèle reste en production parce que :

- il est meilleur que les baselines ;
- il est déjà utilisé avec des règles métier ;
- il sert à classer des créneaux, pas à décider seul ;
- les endpoints Planning confirment que le modèle est bien chargé avec `trained_model_used = True`.

## Limite importante

Le dataset Planning est encore déséquilibré.  
Les cas de succès élevé sont rares.

Le rapport d'audit indique que le dataset est utilisable pour une première régression, mais pas encore idéal pour une classification `HIGH / MEDIUM / LOW`.

## Règle de promotion future

Une nouvelle version Planning peut remplacer `planning-regressor-v1.0.0` uniquement si :

- MAE < 0.0788 ;
- RMSE < 0.1060 ;
- R² > 0.0344 ;
- le modèle reste meilleur que les baselines ;
- la model card est mise à jour ;
- le modèle est promu via le model registry.

## Conclusion

`planning-regressor-v1.0.0` est validé comme modèle de production hybride.

Il est utile pour assister la planification, mais la décision finale reste sous contrôle RH.
'@ | Set-Content reports/planning_model_selection_v1.md -Encoding utf8
