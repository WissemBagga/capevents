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


def ensure_supported_metric_keys(metrics: dict[str, Any]) -> None:
    required_keys = [
        "ndcg_at_10",
        "map_at_10",
        "precision_at_10"
    ]

    missing_keys = [
        key for key in required_keys
        if key not in metrics
    ]

    if missing_keys:
        raise ValueError(
            "metrics.json incomplet. Clés manquantes : "
            + ", ".join(missing_keys)
        )


def create_model_card(
    version: str,
    output_path: Path,
    metrics: dict[str, Any],
    training_data_source: str
) -> None:
    ndcg_at_10 = metrics.get("ndcg_at_10")
    map_at_10 = metrics.get("map_at_10")
    precision_at_10 = metrics.get("precision_at_10")
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
| NDCG@10 | {ndcg_at_10} |
| MAP@10 | {map_at_10} |
| Precision@10 | {precision_at_10} |

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

    metrics = read_metrics(source_metrics)
    ensure_supported_metric_keys(metrics)

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