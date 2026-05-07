import argparse
import json
from pathlib import Path

from training.model_registry import register_model_version


def read_metrics(metrics_path: Path) -> dict:
    if not metrics_path.exists():
        raise FileNotFoundError(f"metrics.json introuvable : {metrics_path}")

    with metrics_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Enregistrer une version candidate du modèle de recommandation."
    )

    parser.add_argument("--version", required=True)
    parser.add_argument("--artifact-path", required=True)
    parser.add_argument("--features-path", required=True)
    parser.add_argument("--metrics-path", required=True)
    parser.add_argument("--model-card-path", required=True)
    parser.add_argument(
        "--training-data-source",
        default="CapEvents PostgreSQL runtime dataset"
    )

    args = parser.parse_args()

    artifact_path = Path(args.artifact_path)
    features_path = Path(args.features_path)
    metrics_path = Path(args.metrics_path)
    model_card_path = Path(args.model_card_path)

    if not artifact_path.exists():
        raise FileNotFoundError(f"Modèle introuvable : {artifact_path}")

    if not features_path.exists():
        raise FileNotFoundError(f"features.json introuvable : {features_path}")

    if not model_card_path.exists():
        raise FileNotFoundError(f"model_card.md introuvable : {model_card_path}")

    metrics = read_metrics(metrics_path)

    register_model_version(
        task="recommendation",
        version=args.version,
        model_name="CatBoostRanker",
        artifact_path=str(artifact_path),
        features_path=str(features_path),
        metrics_path=str(metrics_path),
        model_card_path=str(model_card_path),
        training_data_source=args.training_data_source,
        metrics=metrics,
        status="candidate"
    )

    print(f"Candidate enregistrée : {args.version}")


if __name__ == "__main__":
    main()