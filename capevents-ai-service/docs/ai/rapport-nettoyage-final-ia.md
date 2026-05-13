# Rapport de nettoyage final IA — CapEvents AI Service

## 1. Objectif

Ce document résume l'état final de nettoyage de la partie intelligence artificielle du service `capevents-ai-service`.

Le nettoyage a couvert les quatre modules IA principaux :

- Recommandation IA ;
- Planning Intelligent ;
- Feedback Intelligence ;
- HR Copilot.

L'objectif était de rendre la partie IA plus propre, plus documentée, plus vérifiable et plus adaptée à un projet PFE.

---

## 2. État final attendu

Après nettoyage, le projet doit conserver uniquement les fichiers utiles au fonctionnement, à l'entraînement, à la validation et à la documentation.

Les éléments temporaires doivent être supprimés ou ignorés par Git.

## 3. Dossiers principaux conservés

### Code applicatif

À conserver :

- `app/main.py`
- `app/api/`
- `app/core/`
- `app/data/`
- `app/data/repositories/`
- `app/schemas/`
- `app/services/`

Rôle :

- endpoints FastAPI ;
- services IA ;
- schémas de requêtes et réponses ;
- accès aux données ;
- sécurité ;
- configuration ;
- diagnostic ;
- nettoyage texte runtime.

### Configurations

À conserver :

- `configs/planning_model_config.json`
- `configs/recommendation_dataset_config.json`
- `configs/recommendation_model_config.json`
- `configs/external_event_cleaning_policy.json`
- `configs/external_event_mapping.example.json`

Rôle :

- configurer les datasets ;
- configurer les modèles ;
- garder la traçabilité du traitement des données externes.

### Données

À conserver :

- `datasets/raw/capevents/`
- `datasets/clean/capevents_v1/`
- `datasets/rejected/capevents_v1/`
- `datasets/processed/`
- `datasets/external/kaggle/` si les données externes sont mentionnées dans le PFE.

Rôle :

- garder les données brutes ;
- garder la version nettoyée ;
- garder les lignes rejetées ;
- garder les datasets d'entraînement ;
- assurer la reproductibilité.

### Documentation

À conserver :

- `README.md`
- `datasets/README.md`
- `docs/ai/documentation-technique-ia.md`
- `docs/ai/planning-intelligent.md`
- `docs/ai/recommendation-retraining-strategy.md`
- `docs/ai/resume-pfe-ia.md`
- `docs/ai/rapport-nettoyage-final-ia.md`

Tous les fichiers Markdown doivent rester en français.

### Modèles

À conserver :

- `models_artifacts/model_registry.json`
- `models_artifacts/recommendation/`
- `models_artifacts/planning/`

Rôle :

- conserver les modèles de production ;
- conserver les métriques ;
- conserver les fiches modèles ;
- garder l'historique des candidates utiles à la justification technique.

### Training

À conserver :

- `training/build_recommendation_dataset.py`
- `training/train_recommendation_model.py`
- `training/audit_recommendation_dataset.py`
- `training/build_planning_dataset.py`
- `training/train_planning_regressor.py`
- `training/evaluate_planning_regressor.py`
- `training/audit_planning_dataset.py`
- `training/model_registry.py`
- `training/promote_model.py`
- `training/register_existing_recommendation_model.py`
- `training/augment_recommendation_hard_negatives.py`

Rôle :

- reconstruire les datasets ;
- entraîner les modèles ;
- évaluer les modèles ;
- enregistrer les versions ;
- promouvoir un modèle ;
- documenter les expérimentations.

### Scripts

À conserver :

- `scripts/validate_clean_csv.py`
- `scripts/audit_markdown_french_v1.py`
- `scripts/audit_ai_cleanup_candidates_v1.py`
- `scripts/build_clean_manifest_v1.py`
- `scripts/compare_recommendation_versions.py`
- `scripts/validate_ia4_planning.py`

Rôle :

- validation des CSV ;
- audit Markdown ;
- audit de nettoyage ;
- comparaison des modèles ;
- validation Planning ;
- génération du manifeste clean.

---

## 4. Fichiers supprimés ou à supprimer

Les fichiers suivants ne sont pas nécessaires dans la version finale :

- snapshots temporaires ;
- inventaires intermédiaires ;
- scripts ponctuels `fix_*` ;
- dossiers `logs/` ;
- dossier `tmp/` ;
- dossier `catboost_info/` ;
- backups temporaires de nettoyage ;
- ancien doublon `reports/recommendation/metrics.json` si les métriques sont déjà conservées ailleurs.

Exemples de fichiers temporaires supprimables :

- `datasets/reports/ai_file_inventory_v1.txt`
- `datasets/reports/ai_file_inventory_v2.txt`
- `datasets/reports/ai_file_inventory_final_v1.txt`
- `datasets/reports/ai_file_inventory_final_clean_v1.txt`
- `datasets/reports/ai_file_inventory_after_cleanup_v1.txt`
- `datasets/reports/*_snapshot_v1.txt`
- `scripts/fix_*`

---

## 5. Fichiers importants à garder dans `datasets/reports/`

À garder :

- `datasets/reports/data_quality_report_v1.md`
- `datasets/reports/data_quality_errors_v1.csv`
- `datasets/reports/export_manifest_clean_v1.json`
- `datasets/reports/warnings_fix_report_v1.md`

Rôle :

- prouver la qualité des données ;
- garder la trace des corrections ;
- démontrer que la validation finale est passée.

---

## 6. Fichiers importants à garder dans `reports/`

À garder :

- `reports/ai_cleanup_candidates_v1.md`
- `reports/markdown_french_audit_v1.md`
- `reports/planning_dataset_audit.json`
- `reports/planning_model_selection_v1.md`
- `reports/recommendation_dataset_audit.json`
- `reports/recommendation/recommendation_model_selection_v1.md`
- `reports/recommendation/recommendation_versions_comparison.json`
- `reports/recommendation/recommendation-v1.3.0_metrics.json`
- `reports/recommendation/recommendation-v1.4.0_metrics.json`
- `reports/recommendation/recommendation-v1.5.0_metrics.json`

Rôle :

- documenter les décisions modèles ;
- expliquer pourquoi certaines candidates ne sont pas promues ;
- prouver que tous les Markdown sont en français ;
- conserver les audits IA.

---

## 7. Fichiers ignorés par Git

Le `.gitignore` doit ignorer :

- `.env`
- `.venv/`
- `__pycache__/`
- `*.pyc`
- `.pytest_cache/`
- `tmp/`
- `logs/`
- `catboost_info/`
- `mlruns/`
- backups temporaires de nettoyage.

---

## 8. Validations finales

Les validations finales à exécuter sont :

```bash
python -m compileall app scripts training
python scripts/validate_clean_csv.py
python scripts/audit_markdown_french_v1.py
```

Résultats attendus :

- aucune erreur Python ;
- erreurs CSV : 0 ;
- warnings CSV : 0 ;
- fichiers Markdown à corriger : 0.

---

## 9. Tests API recommandés

Tester le diagnostic :

```bash
GET /ai/diagnostics/status
```

Tester les modules IA :

```bash
GET /ai/recommendations/users/{user_id}?limit=5
POST /ai/planning/suggestions
GET /ai/feedback/events/{event_id}/insights
GET /ai/hr-copilot/suggestions
GET /ai/monitoring/hr-copilot/summary?limit=5
```

Les réponses doivent être lisibles, en français, et sans caractères cassés.

---

## 10. Décisions modèles

### Recommandation IA

Version de production :

```text
recommendation-v1.0.0
```

Décision :

- conservée en production ;
- meilleure que les candidates récentes sur Precision@5 et NDCG@5 ;
- Recall@5 historique non mesuré.

### Planning Intelligent

Version de production :

```text
planning-regressor-v1.0.0
```

Décision :

- conservée en production ;
- meilleure que les baselines ;
- utilisée comme score hybride, pas comme décision automatique.

---

## 11. Conclusion

La partie IA est maintenant structurée, nettoyée et documentée.

Les fichiers temporaires ont été supprimés ou ignorés.

Les quatre modules IA sont conservés :

- Recommandation IA ;
- Planning Intelligent ;
- Feedback Intelligence ;
- HR Copilot.

Les données propres, les modèles, les rapports de décision et les scripts de validation restent disponibles pour assurer la reproductibilité du projet PFE.
