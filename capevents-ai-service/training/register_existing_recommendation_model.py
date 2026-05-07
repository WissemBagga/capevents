import json
from pathlib import Path


from training.model_registry import register_model_version, model_version_exists


MODEL_PATH = Path("models_artifacts/recommendation/catboost_recommender.cbm")
FEATURES_PATH = Path("models_artifacts/recommendation/features.json")
METRICS_PATH = Path("models_artifacts/recommendation/metrics.json")
MODEL_CARD_PATH = Path("models_artifacts/recommendation/model_card.md")


def ensure_default_metrics() -> dict:
    if METRICS_PATH.exists():
        with METRICS_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)

    metrics = {
        "metric_note": "Métriques initiales à compléter après évaluation complète.",
        "ndcg_at_10": None,
        "map_at_10": None,
        "precision_at_10": None
    }

    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)

    with METRICS_PATH.open("w", encoding="utf-8") as file:
        json.dump(metrics, file, ensure_ascii=False, indent=2)

    return metrics


def ensure_model_card() -> None:
    if MODEL_CARD_PATH.exists():
        return

    MODEL_CARD_PATH.write_text(
        """# Model Card — Recommendation v1.0.0

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

PostgreSQL CapEvents est la source runtime utilisée par le service IA.

## Source training initiale

La version initiale du modèle a été entraînée sur un snapshot enrichi composé de :

- exports CapEvents ;
- données synthétiques cohérentes ;
- données externes curated lorsque présentes dans le dataset préparé.

Ces données servent à initialiser le modèle dans un contexte où les données réelles historiques sont encore limitées.

## Limites

- Le modèle dépend de la qualité des données historiques.
- Les nouveaux utilisateurs peuvent avoir moins de signaux comportementaux.
- Les décisions finales restent encadrées par des règles métier.

## Statut

Version initiale enregistrée comme modèle production.
""",
        encoding="utf-8"
    )


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Modèle introuvable : {MODEL_PATH}")

    if not FEATURES_PATH.exists():
        raise FileNotFoundError(f"features.json introuvable : {FEATURES_PATH}")
    
    if model_version_exists("recommendation", "recommendation-v1.0.0"):
        print("Modèle recommendation-v1.0.0 déjà enregistré. Aucune action nécessaire.")
        return

    metrics = ensure_default_metrics()
    ensure_model_card()

    register_model_version(
        task="recommendation",
        version="recommendation-v1.0.0",
        model_name="CatBoostRanker",
        artifact_path=str(MODEL_PATH),
        features_path=str(FEATURES_PATH),
        metrics_path=str(METRICS_PATH),
        model_card_path=str(MODEL_CARD_PATH),
        training_data_source=(
            "Export CapEvents enrichi + données synthétiques cohérentes "
            "+ données externes curated pour le dataset initial"
        ),
        metrics=metrics,
        status="production"
    )

    print("Modèle recommendation-v1.0.0 enregistré en production.")


if __name__ == "__main__":
    main()