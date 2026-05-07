import argparse
import json
import shutil
from pathlib import Path
from typing import Any

from training.model_registry import register_model_version


def read_metrics(metrics_path: Path) -> dict[str, Any]:
    if not metrics_path.exists():
        raise FileNotFoundError(f"metrics.json introuvable : {metrics_path}")

    with metrics_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def ensure_file_exists(path: Path, label: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"{label} introuvable : {path}")

    if not path.is_file():
        raise ValueError(f"{label} n’est pas un fichier valide : {path}")


def normalize_recommendation_metrics(metrics_payload: dict[str, Any]) -> dict[str, Any]:
    nested_metrics = metrics_payload.get("metrics", {})

    if not isinstance(nested_metrics, dict):
        nested_metrics = {}

    normalized = {
        "precision_at_5": metrics_payload.get("precision_at_5", nested_metrics.get("precision_at_5")),
        "ndcg_at_5": metrics_payload.get("ndcg_at_5", nested_metrics.get("ndcg_at_5")),
        "precision_at_10": metrics_payload.get("precision_at_10", nested_metrics.get("precision_at_10")),
        "ndcg_at_10": metrics_payload.get("ndcg_at_10", nested_metrics.get("ndcg_at_10")),
        "map_at_10": metrics_payload.get("map_at_10", nested_metrics.get("map_at_10")),
        "evaluated_users": metrics_payload.get("evaluated_users", nested_metrics.get("evaluated_users")),
        "evaluated_rows": metrics_payload.get("evaluated_rows", nested_metrics.get("evaluated_rows")),
        "evaluation_data": metrics_payload.get("evaluation_data", "CapEvents validation dataset"),
        "metric_note": metrics_payload.get("metric_note", "")
    }

    has_at_least_one_quality_metric = any(
        normalized.get(key) is not None
        for key in [
            "precision_at_5",
            "ndcg_at_5",
            "precision_at_10",
            "ndcg_at_10",
            "map_at_10"
        ]
    )

    if not has_at_least_one_quality_metric:
        raise ValueError(
            "metrics.json ne contient aucune métrique exploitable. "
            "Ajoutez au moins precision_at_5, ndcg_at_5, precision_at_10, ndcg_at_10 ou map_at_10."
        )

    normalized["raw_metrics"] = metrics_payload

    return normalized


def create_model_card(
    version: str,
    output_path: Path,
    metrics: dict[str, Any],
    training_data_source: str
) -> None:
    precision_at_5 = metrics.get("precision_at_5")
    ndcg_at_5 = metrics.get("ndcg_at_5")
    precision_at_10 = metrics.get("precision_at_10")
    ndcg_at_10 = metrics.get("ndcg_at_10")
    map_at_10 = metrics.get("map_at_10")
    evaluated_users = metrics.get("evaluated_users")
    evaluated_rows = metrics.get("evaluated_rows")
    evaluation_data = metrics.get("evaluation_data", "Non précisé")
    metric_note = metrics.get("metric_note", "")

    output_path.write_text(
        f"""# Model Card — {version}

## Modèle

CatBoostRanker pour la recommandation personnalisée d’événements CapEvents.

## Version

{version}

## Statut

Candidate.

## Objectif

Classer les événements publiés selon leur pertinence pour un utilisateur donné.

## Données utilisées

{training_data_source}

## Données d’évaluation

{evaluation_data}

## Métriques

| Métrique | Valeur |
|---|---:|
| Precision@5 | {precision_at_5} |
| NDCG@5 | {ndcg_at_5} |
| Precision@10 | {precision_at_10} |
| NDCG@10 | {ndcg_at_10} |
| MAP@10 | {map_at_10} |
| Utilisateurs évalués | {evaluated_users} |
| Lignes évaluées | {evaluated_rows} |

## Note métriques

{metric_note or "Aucune note spécifique."}

## Règle de déploiement

Cette version ne doit pas être utilisée en production automatiquement.

Elle doit être comparée à la version production active dans le model registry.

Si les métriques sont meilleures ou acceptables, elle peut être promue avec la commande suivante :

    python -m training.promote_model --task recommendation --version {version}

## Limites

- La qualité dépend de l’historique réel disponible.
- Les nouveaux utilisateurs peuvent avoir moins de signaux comportementaux.
- Les recommandations restent filtrées par les règles métier runtime.
- Une candidate ne doit jamais être promue sans validation des métriques.

## Décision

Statut actuel : candidate.
""",
        encoding="utf-8"
    )


def copy_candidate_files(
    source_artifact: Path,
    source_features: Path,
    source_metrics: Path,
    candidate_dir: Path
) -> tuple[Path, Path, Path, Path]:
    candidate_dir.mkdir(parents=True, exist_ok=True)

    target_artifact = candidate_dir / "catboost_recommender.cbm"
    target_features = candidate_dir / "features.json"
    target_metrics = candidate_dir / "metrics.json"
    target_model_card = candidate_dir / "model_card.md"

    shutil.copy2(source_artifact, target_artifact)
    shutil.copy2(source_features, target_features)
    shutil.copy2(source_metrics, target_metrics)

    return target_artifact, target_features, target_metrics, target_model_card


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Enregistrer une nouvelle version candidate du modèle de recommandation."
    )

    parser.add_argument(
        "--version",
        required=True,
        help="Version candidate. Exemple : recommendation-v1.1.0"
    )

    parser.add_argument(
        "--artifact-path",
        required=True,
        help="Chemin du fichier .cbm entraîné."
    )

    parser.add_argument(
        "--features-path",
        required=True,
        help="Chemin du features.json utilisé par le modèle."
    )

    parser.add_argument(
        "--metrics-path",
        required=True,
        help="Chemin du metrics.json produit par l’évaluation."
    )

    parser.add_argument(
        "--training-data-source",
        default="CapEvents PostgreSQL runtime dataset",
        help="Description courte des données utilisées pour le réentraînement."
    )

    args = parser.parse_args()

    version = args.version.strip()

    if not version.startswith("recommendation-v"):
        raise ValueError(
            "La version doit commencer par recommendation-v. "
            "Exemple : recommendation-v1.1.0"
        )

    source_artifact = Path(args.artifact_path)
    source_features = Path(args.features_path)
    source_metrics = Path(args.metrics_path)

    ensure_file_exists(source_artifact, "Modèle CatBoost")
    ensure_file_exists(source_features, "features.json")
    ensure_file_exists(source_metrics, "metrics.json")

    raw_metrics = read_metrics(source_metrics)
    metrics = normalize_recommendation_metrics(raw_metrics)

    candidate_dir = Path("models_artifacts/recommendation/versions") / version

    (
        target_artifact,
        target_features,
        target_metrics,
        target_model_card
    ) = copy_candidate_files(
        source_artifact=source_artifact,
        source_features=source_features,
        source_metrics=source_metrics,
        candidate_dir=candidate_dir
    )

    create_model_card(
        version=version,
        output_path=target_model_card,
        metrics=metrics,
        training_data_source=args.training_data_source
    )

    register_model_version(
        task="recommendation",
        version=version,
        model_name="CatBoostRanker",
        artifact_path=str(target_artifact),
        features_path=str(target_features),
        metrics_path=str(target_metrics),
        model_card_path=str(target_model_card),
        training_data_source=args.training_data_source,
        metrics=metrics,
        status="candidate"
    )

    print("Version candidate enregistrée avec succès.")
    print(f"Version : {version}")
    print(f"Dossier : {candidate_dir}")
    print("Statut : candidate")
    print("Production inchangée : cette version n’est pas encore active.")


if __name__ == "__main__":
    main()