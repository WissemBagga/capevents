# Audit de nettoyage global IA — CapEvents AI

Généré le : 2026-05-13T14:17:41.805494+00:00

## Règle importante

Ce rapport est non destructif. Aucun fichier n'est supprimé automatiquement.

## Dossiers temporaires détectés

- `logs` : à supprimer ou ignorer dans Git
- `tmp` : à supprimer ou ignorer dans Git

## Scripts `scripts/`

| Fichier | Décision |
|---|---|
| `scripts/audit_ai_cleanup_candidates_v1.py` | à vérifier |
| `scripts/audit_markdown_french_v1.py` | à garder |
| `scripts/build_clean_manifest_v1.py` | à garder |
| `scripts/compare_recommendation_versions.py` | à garder |
| `scripts/fix_feedback_copilot_encoding_v1.py` | à supprimer après validation |
| `scripts/fix_remaining_warnings_v1.py` | à supprimer après validation |
| `scripts/fix_self_invitations.py` | à supprimer après validation |
| `scripts/fix_warnings_v1.py` | à supprimer après validation |
| `scripts/validate_clean_csv.py` | à garder |
| `scripts/validate_ia4_planning.py` | à garder |

## Scripts `training/`

| Fichier | Décision |
|---|---|
| `training/audit_planning_dataset.py` | à garder |
| `training/audit_recommendation_dataset.py` | à garder |
| `training/augment_recommendation_hard_negatives.py` | à garder seulement si on conserve l'expérience v1.5.0 |
| `training/build_planning_dataset.py` | à garder |
| `training/build_recommendation_dataset.py` | à garder |
| `training/evaluate_planning_regressor.py` | à garder |
| `training/model_registry.py` | à garder |
| `training/promote_model.py` | à garder |
| `training/register_existing_recommendation_model.py` | à garder |
| `training/train_planning_regressor.py` | à garder |
| `training/train_recommendation_model.py` | à garder |

## Modules `app/` potentiellement non importés

- `app/data/curate_external_events.py`
- `app/data/export_capevents_data.py`
- `app/data/normalize_external_events.py`

## Fonctions ou classes potentiellement inutilisées

- `app/core/config.py` ligne 4 : `Settings` (ClassDef)
- `app/data/curate_external_events.py` ligne 150 : `build_title` (FunctionDef)
- `app/data/curate_external_events.py` ligne 168 : `random_datetime_between` (FunctionDef)
- `app/data/curate_external_events.py` ligne 186 : `curate_external_events` (FunctionDef)
- `app/data/export_capevents_data.py` ligne 158 : `export_query_to_csv` (FunctionDef)
- `app/data/normalize_external_events.py` ligne 138 : `parse_duration_minutes` (FunctionDef)
- `app/data/normalize_external_events.py` ligne 156 : `estimate_capacity` (FunctionDef)
- `app/data/normalize_external_events.py` ligne 167 : `next_date_for_day` (FunctionDef)
- `app/data/normalize_external_events.py` ligne 212 : `normalize_external_events` (FunctionDef)
- `app/data/repositories/analytics_repository.py` ligne 6 : `count_registrations` (FunctionDef)
- `app/data/repositories/analytics_repository.py` ligne 10 : `count_invitations` (FunctionDef)
- `app/data/repositories/event_repository.py` ligne 6 : `count_events` (FunctionDef)
- `app/data/repositories/event_repository.py` ligne 10 : `count_published_events` (FunctionDef)
- `app/data/repositories/feedback_repository.py` ligne 6 : `count_feedbacks` (FunctionDef)
- `app/data/repositories/user_repository.py` ligne 6 : `count_active_users` (FunctionDef)
- `app/data/runtime_loader.py` ligne 98 : `load_runtime_interests` (FunctionDef)
- `app/data/runtime_loader.py` ligne 111 : `load_runtime_user_interests` (FunctionDef)
- `app/data/runtime_loader.py` ligne 120 : `load_runtime_points` (FunctionDef)
- `app/data/runtime_loader.py` ligne 134 : `load_runtime_badges` (FunctionDef)
- `app/data/runtime_loader.py` ligne 144 : `load_runtime_invitation_reminders` (FunctionDef)
- `app/main.py` ligne 63 : `create_app` (FunctionDef)
- `app/main.py` ligne 87 : `register_routers` (FunctionDef)
- `app/services/copilot_logger.py` ligne 48 : `log_hr_copilot_feedback` (FunctionDef)
- `app/services/copilot_monitoring_service.py` ligne 18 : `CopilotMonitoringService` (ClassDef)
- `app/services/copilot_monitoring_service.py` ligne 19 : `get_hr_copilot_summary` (FunctionDef)
- `app/services/copilot_monitoring_service.py` ligne 105 : `_read_records` (FunctionDef)
- `app/services/copilot_monitoring_service.py` ligne 126 : `_to_recent_call` (FunctionDef)
- `app/services/copilot_monitoring_service.py` ligne 147 : `_read_feedback_records` (FunctionDef)
- `app/services/diagnostics_service.py` ligne 28 : `DiagnosticsService` (ClassDef)
- `app/services/diagnostics_service.py` ligne 69 : `_get_runtime_counts` (FunctionDef)
- `app/services/diagnostics_service.py` ligne 99 : `_get_recommendation_model_status` (FunctionDef)
- `app/services/diagnostics_service.py` ligne 160 : `_is_ollama_available` (FunctionDef)
- `app/services/diagnostics_service.py` ligne 170 : `_build_status` (FunctionDef)
- `app/services/diagnostics_service.py` ligne 184 : `_build_message` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 49 : `FeedbackInsightsService` (ClassDef)
- `app/services/feedback_insights_service.py` ligne 54 : `_get_event_from_database` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 73 : `_get_feedbacks_from_database` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 94 : `_get_sentiment_pipeline` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 103 : `_get_embedding_model` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 108 : `get_event_feedback_insights` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 199 : `_analyze_sentiments` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 220 : `_map_sentiment_label` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 234 : `_build_sentiment_distribution` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 243 : `_compute_global_sentiment` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 262 : `_extract_topics` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 338 : `_extract_keywords_from_topics` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 348 : `_simple_keywords` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 362 : `_extract_strengths` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 378 : `_extract_improvements` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 411 : `_build_template_summary` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 442 : `_build_qwen_summary` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 604 : `_clean_for_nlp` (FunctionDef)
- `app/services/feedback_insights_service.py` ligne 616 : `_truncate_text` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 24 : `HrCopilotService` (ClassDef)
- `app/services/hr_copilot_service.py` ligne 104 : `_detect_pending_invitations` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 197 : `_detect_low_registration_events` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 241 : `_detect_low_feedback_events` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 279 : `_detect_low_engagement_departments` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 333 : `_detect_rsvp_friction_events` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 421 : `_rank_suggestions` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 456 : `_build_qwen_draft` (FunctionDef)
- `app/services/hr_copilot_service.py` ligne 535 : `_build_fallback_draft` (FunctionDef)
- `app/services/monitoring_service.py` ligne 13 : `MonitoringService` (ClassDef)
- `app/services/monitoring_service.py` ligne 17 : `get_recommendation_summary` (FunctionDef)
- `app/services/monitoring_service.py` ligne 72 : `_read_recommendation_logs` (FunctionDef)
- `app/services/monitoring_service.py` ligne 98 : `_build_top_recommended_events` (FunctionDef)
- `app/services/monitoring_service.py` ligne 134 : `_build_recent_predictions` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 150 : `PlanningIdeationService` (ClassDef)
- `app/services/planning_ideation_service.py` ligne 355 : `_build_context` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 557 : `_normalize_category` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 595 : `_infer_category_from_title` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 634 : `_preferred_location_for_category` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 652 : `_is_professional_title` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 666 : `_has_forbidden_title_terms` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 688 : `_normalize_objective` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 702 : `_normalize_rationale` (FunctionDef)
- `app/services/planning_ideation_service.py` ligne 728 : `_clean_data_signals` (FunctionDef)
- `app/services/planning_llm_client.py` ligne 17 : `PlanningLlmClient` (ClassDef)
- `app/services/planning_llm_client.py` ligne 113 : `_parse_json_content` (FunctionDef)
- `app/services/planning_llm_client.py` ligne 172 : `_bool_env` (FunctionDef)
- `app/services/planning_monitoring_service.py` ligne 21 : `read_planning_logs` (FunctionDef)
- `app/services/planning_monitoring_service.py` ligne 51 : `get_planning_monitoring_summary` (FunctionDef)
- `app/services/planning_service.py` ligne 68 : `parse_start_date` (FunctionDef)
- `app/services/planning_service.py` ligne 79 : `parse_candidate_start_date` (FunctionDef)
- `app/services/planning_service.py` ligne 146 : `clean_list` (FunctionDef)
- `app/services/planning_service.py` ligne 152 : `PlanningService` (ClassDef)
- `app/services/planning_service.py` ligne 161 : `_load_dataset` (FunctionDef)
- `app/services/planning_service.py` ligne 253 : `_generate_candidate_slots` (FunctionDef)
- `app/services/planning_service.py` ligne 286 : `_load_runtime_events_safe` (FunctionDef)
- `app/services/planning_service.py` ligne 312 : `_score_slot` (FunctionDef)
- `app/services/planning_service.py` ligne 423 : `_historical_metrics` (FunctionDef)
- `app/services/planning_service.py` ligne 503 : `_conflict_metrics` (FunctionDef)
- `app/services/planning_service.py` ligne 548 : `_time_preference_score` (FunctionDef)
- `app/services/planning_service.py` ligne 560 : `_confidence_label` (FunctionDef)
- `app/services/planning_service.py` ligne 606 : `propose_events` (FunctionDef)
- `app/services/planning_service.py` ligne 868 : `_select_diverse_slots` (FunctionDef)
- `app/services/planning_service.py` ligne 930 : `_preferred_location_for_category` (FunctionDef)
- `app/services/planning_service.py` ligne 1010 : `_category_hour_score` (FunctionDef)
- `app/services/planning_service.py` ligne 1047 : `_day_preference_score` (FunctionDef)
- `app/services/planning_service.py` ligne 1061 : `_horizon_score` (FunctionDef)
- `app/services/planning_service.py` ligne 1075 : `_load_planning_model` (FunctionDef)
- `app/services/planning_service.py` ligne 1104 : `_predict_slot_success_score` (FunctionDef)
- `app/services/planning_service.py` ligne 1162 : `_estimate_department_size` (FunctionDef)
- `app/services/planning_service.py` ligne 1181 : `_calibrate_candidate_scores` (FunctionDef)
- `app/services/planning_service.py` ligne 1269 : `_business_slot_score` (FunctionDef)
- `app/services/planning_service.py` ligne 1379 : `_category_stats_from_weekly_metrics` (FunctionDef)
- `app/services/planning_service.py` ligne 1425 : `_proposal_completeness_score` (FunctionDef)
- `app/services/planning_service.py` ligne 1443 : `_recent_planning_usage_counters` (FunctionDef)
- `app/services/planning_service.py` ligne 1493 : `debug_ideation` (FunctionDef)
- `app/services/recommendation_service.py` ligne 86 : `clean_text_list` (FunctionDef)
- `app/services/recommendation_service.py` ligne 152 : `RecommendationService` (ClassDef)
- `app/services/recommendation_service.py` ligne 189 : `_prepare_dataframes` (FunctionDef)
- `app/services/recommendation_service.py` ligne 358 : `_find_user` (FunctionDef)
- `app/services/recommendation_service.py` ligne 369 : `_get_registered_event_ids` (FunctionDef)
- `app/services/recommendation_service.py` ligne 383 : `_build_candidate_rows` (FunctionDef)
- `app/services/recommendation_service.py` ligne 564 : `_prepare_prediction_input` (FunctionDef)
- `app/services/recommendation_service.py` ligne 581 : `_get_event_stats` (FunctionDef)
- `app/services/recommendation_service.py` ligne 615 : `_get_user_history` (FunctionDef)
- `app/services/recommendation_service.py` ligne 657 : `_get_user_category_history` (FunctionDef)
- `app/services/recommendation_service.py` ligne 703 : `_get_invitation_features` (FunctionDef)
- `app/services/recommendation_service.py` ligne 732 : `_get_user_interest_codes` (FunctionDef)
- `app/services/recommendation_service.py` ligne 751 : `_get_user_points` (FunctionDef)
- `app/services/recommendation_service.py` ligne 767 : `_get_user_badges` (FunctionDef)
- `app/services/recommendation_service.py` ligne 829 : `_load_model_from_registry` (FunctionDef)
- `app/services/recommendation_service.py` ligne 870 : `_get_invitation_reminder_features` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 73 : `to_module_name` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 78 : `list_python_files` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 96 : `parse_file` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 103 : `collect_imports` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 121 : `collect_name_usage` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 134 : `collect_definitions` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 149 : `classify_script` (FunctionDef)
- `scripts/audit_ai_cleanup_candidates_v1.py` ligne 161 : `classify_training_file` (FunctionDef)
- `scripts/audit_markdown_french_v1.py` ligne 49 : `should_ignore_report_itself` (FunctionDef)
- `scripts/audit_markdown_french_v1.py` ligne 53 : `detect_issues` (FunctionDef)
- `scripts/build_clean_manifest_v1.py` ligne 28 : `count_rows` (FunctionDef)
- `scripts/build_clean_manifest_v1.py` ligne 37 : `file_sha256` (FunctionDef)
- `scripts/fix_feedback_copilot_encoding_v1.py` ligne 101 : `fix_mojibake` (FunctionDef)
- `scripts/fix_feedback_copilot_encoding_v1.py` ligne 120 : `fix_file` (FunctionDef)
- `scripts/fix_remaining_warnings_v1.py` ligne 39 : `load_invalid_phone_user_ids` (FunctionDef)
- `scripts/fix_self_invitations.py` ligne 28 : `load_self_invitation_ids` (FunctionDef)
- `scripts/fix_warnings_v1.py` ligne 49 : `normalize_phone` (FunctionDef)
- `scripts/fix_warnings_v1.py` ligne 71 : `infer_department` (FunctionDef)
- `scripts/fix_warnings_v1.py` ligne 123 : `fix_user_interests` (FunctionDef)
- `scripts/fix_warnings_v1.py` ligne 148 : `fix_users` (FunctionDef)
- `scripts/validate_clean_csv.py` ligne 522 : `write_reports` (FunctionDef)
- `scripts/validate_ia4_planning.py` ligne 11 : `post_json` (FunctionDef)
- `scripts/validate_ia4_planning.py` ligne 26 : `get_json` (FunctionDef)
- `scripts/validate_ia4_planning.py` ligne 48 : `validate_model_artifacts` (FunctionDef)
- `scripts/validate_ia4_planning.py` ligne 79 : `validate_event_proposals` (FunctionDef)
- `scripts/validate_ia4_planning.py` ligne 124 : `validate_monitoring` (FunctionDef)
- `training/augment_recommendation_hard_negatives.py` ligne 37 : `build_interacted_pairs` (FunctionDef)
- `training/augment_recommendation_hard_negatives.py` ligne 48 : `build_invitation_hard_negatives` (FunctionDef)
- `training/augment_recommendation_hard_negatives.py` ligne 93 : `build_same_department_hard_negatives` (FunctionDef)
- `training/build_planning_dataset.py` ligne 32 : `read_first_existing` (FunctionDef)
- `training/build_planning_dataset.py` ligne 55 : `prepare_events` (FunctionDef)
- `training/build_planning_dataset.py` ligne 92 : `build_registration_aggregates` (FunctionDef)
- `training/build_planning_dataset.py` ligne 119 : `build_feedback_aggregates` (FunctionDef)
- `training/build_planning_dataset.py` ligne 137 : `build_invitation_aggregates` (FunctionDef)
- `training/build_planning_dataset.py` ligne 163 : `build_department_sizes` (FunctionDef)
- `training/build_planning_dataset.py` ligne 184 : `add_conflict_features` (FunctionDef)
- `training/build_planning_dataset.py` ligne 215 : `add_targets` (FunctionDef)
- `training/build_planning_dataset.py` ligne 286 : `add_historical_features` (FunctionDef)
- `training/build_recommendation_dataset.py` ligne 324 : `compute_target_score` (FunctionDef)
- `training/build_recommendation_dataset.py` ligne 346 : `compute_interest_match` (FunctionDef)
- `training/model_registry.py` ligne 82 : `promote_model_version` (FunctionDef)
- `training/register_existing_recommendation_model.py` ligne 14 : `ensure_default_metrics` (FunctionDef)
- `training/register_existing_recommendation_model.py` ligne 34 : `ensure_model_card` (FunctionDef)
- `training/train_planning_regressor.py` ligne 22 : `prepare_dataset` (FunctionDef)
- `training/train_recommendation_model.py` ligne 25 : `ensure_directory` (FunctionDef)
- `training/train_recommendation_model.py` ligne 31 : `build_default_version` (FunctionDef)
- `training/train_recommendation_model.py` ligne 36 : `prepare_candidate_output_dir` (FunctionDef)
- `training/train_recommendation_model.py` ligne 108 : `prepare_dataframe` (FunctionDef)
- `training/train_recommendation_model.py` ligne 148 : `split_by_user` (FunctionDef)
- `training/train_recommendation_model.py` ligne 183 : `build_feature_columns` (FunctionDef)
- `training/train_recommendation_model.py` ligne 217 : `precision_at_k` (FunctionDef)
- `training/train_recommendation_model.py` ligne 226 : `recall_at_k` (FunctionDef)
- `training/train_recommendation_model.py` ligne 241 : `ndcg_at_k` (FunctionDef)
- `training/train_recommendation_model.py` ligne 265 : `evaluate_grouped` (FunctionDef)

## Recommandations générales

- Ne pas supprimer les fichiers dans `app/api/`, `app/services/` et `app/schemas/` sans test endpoint.
- Ne pas supprimer une version de modèle référencée dans `models_artifacts/model_registry.json` sans mettre à jour le registry.
- Les scripts `fix_*` sont généralement ponctuels et peuvent être supprimés après validation.
- Les logs et backups temporaires doivent être ignorés par Git.
- Les scripts d'entraînement et d'audit doivent rester pour la reproductibilité du PFE.
