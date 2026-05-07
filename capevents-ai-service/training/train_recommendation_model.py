import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from catboost import CatBoostRanker, Pool

from training.model_registry import register_model_version


IDENTIFIER_COLUMNS = {
    "user_id",
    "event_id",
    "data_source"
}


def load_config(path: str = "configs/recommendation_model_config.json") -> dict:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def ensure_directory(path: str | Path) -> Path:
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def build_default_version() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"recommendation-{timestamp}"


def prepare_candidate_output_dir(version: str) -> Path:
    output_dir = Path("models_artifacts") / "recommendation" / "versions" / version
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def write_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def write_model_card(
    path: Path,
    version: str,
    metrics: dict,
    training_rows: int,
    validation_rows: int
) -> None:
    metrics_json = json.dumps(metrics, ensure_ascii=False, indent=2)

    content = f"""# Model Card — {version}

## Modèle

CatBoostRanker pour la recommandation personnalisée d’événements CapEvents.

## Objectif

Classer les événements publiés selon leur pertinence pour un utilisateur donné.

## Statut

Candidate.

## Données utilisées

Source principale : PostgreSQL CapEvents.

## Taille dataset

- Training rows : {training_rows}
- Validation rows : {validation_rows}

## Métriques

{metrics_json}

## Règle de déploiement

Cette version candidate ne doit pas être utilisée en production tant qu’elle n’a pas été promue avec :

python -m training.promote_model --task recommendation --version {version}

## Limites

- Les performances dépendent de la qualité des historiques d’inscription, présence, invitation et feedback.
- Le cold-start reste possible pour les nouveaux utilisateurs.
- Le modèle ne remplace pas les règles métier de disponibilité, capacité et deadline.
"""

    path.write_text(content, encoding="utf-8")


def prepare_dataframe(
    df: pd.DataFrame,
    categorical_features: list[str],
    group_column: str,
    target_column: str
) -> pd.DataFrame:
    df = df.copy()

    if target_column not in df.columns:
        raise ValueError(f"La colonne {target_column} est obligatoire.")

    if group_column not in df.columns:
        raise ValueError(f"La colonne {group_column} est obligatoire pour le ranking.")

    df["target_label"] = pd.to_numeric(
        df[target_column],
        errors="coerce"
    ).fillna(0).clip(lower=0)

    text_columns = set(categorical_features)
    text_columns.add(group_column)
    text_columns.update(IDENTIFIER_COLUMNS)

    for column in df.columns:
        if column in text_columns:
            df[column] = (
                df[column]
                .replace([np.inf, -np.inf], np.nan)
                .fillna("UNKNOWN")
                .astype(str)
            )
        elif column not in {target_column, "target_label"}:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            ).replace([np.inf, -np.inf], np.nan).fillna(0)

    return df


def split_by_user(
    df: pd.DataFrame,
    validation_user_ratio: float,
    random_state: int
) -> tuple[pd.DataFrame, pd.DataFrame]:
    users = np.array(
        df["user_id"].dropna().astype(str).unique().tolist(),
        dtype=str
    )

    if len(users) < 2:
        raise ValueError(
            "Impossible de faire un split train/validation : "
            f"seulement {len(users)} utilisateur unique trouvé. "
            "Vérifie que la colonne user_id n'a pas été transformée en 0."
        )

    rng = np.random.default_rng(random_state)
    rng.shuffle(users)

    validation_size = max(1, int(len(users) * validation_user_ratio))
    validation_users = set(users[:validation_size])

    train_df = df[~df["user_id"].isin(validation_users)].copy()
    valid_df = df[df["user_id"].isin(validation_users)].copy()

    if train_df.empty or valid_df.empty:
        raise ValueError(
            "Split invalide : train ou validation est vide. "
            "Diminue validation_user_ratio ou vérifie user_id."
        )

    return train_df, valid_df


def build_feature_columns(df: pd.DataFrame, drop_columns: list[str]) -> list[str]:
    excluded = set(drop_columns)
    excluded.add("target_label")

    return [column for column in df.columns if column not in excluded]


def sort_for_ranking(df: pd.DataFrame) -> pd.DataFrame:
    return df.sort_values(["user_id"]).reset_index(drop=True)


def build_pool(
    df: pd.DataFrame,
    feature_columns: list[str],
    categorical_features: list[str]
) -> Pool:
    df = sort_for_ranking(df)

    cat_features_existing = [
        feature for feature in categorical_features
        if feature in feature_columns
    ]

    for column in cat_features_existing:
        df[column] = df[column].fillna("UNKNOWN").astype(str)

    return Pool(
        data=df[feature_columns],
        label=df["target_label"],
        group_id=df["user_id"].astype(str),
        cat_features=cat_features_existing
    )


def precision_at_k(labels: np.ndarray, predictions: np.ndarray, k: int = 5) -> float:
    if len(labels) == 0:
        return 0.0

    order = np.argsort(predictions)[::-1][:k]
    top_labels = labels[order]

    return float(np.mean(top_labels > 0))


def ndcg_at_k(labels: np.ndarray, predictions: np.ndarray, k: int = 5) -> float:
    if len(labels) == 0:
        return 0.0

    order = np.argsort(predictions)[::-1][:k]
    ranked_labels = labels[order]

    ideal_order = np.argsort(labels)[::-1][:k]
    ideal_labels = labels[ideal_order]

    def dcg(values: np.ndarray) -> float:
        score = 0.0
        for index, relevance in enumerate(values):
            score += (2 ** relevance - 1) / np.log2(index + 2)
        return float(score)

    ideal_dcg = dcg(ideal_labels)

    if ideal_dcg == 0:
        return 0.0

    return dcg(ranked_labels) / ideal_dcg


def evaluate_grouped(
    df: pd.DataFrame,
    predictions: np.ndarray,
    k: int = 5
) -> dict[str, Any]:
    eval_df = df.copy()
    eval_df["prediction"] = predictions

    precision_scores = []
    ndcg_scores = []

    for _, group in eval_df.groupby("user_id"):
        labels = group["target_label"].to_numpy()
        preds = group["prediction"].to_numpy()

        precision_scores.append(precision_at_k(labels, preds, k=k))
        ndcg_scores.append(ndcg_at_k(labels, preds, k=k))

    return {
        f"precision_at_{k}": float(np.mean(precision_scores)) if precision_scores else 0.0,
        f"ndcg_at_{k}": float(np.mean(ndcg_scores)) if ndcg_scores else 0.0,
        "evaluated_users": int(eval_df["user_id"].nunique()),
        "evaluated_rows": int(len(eval_df))
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Entraîner une version candidate du modèle de recommandation."
    )
    parser.add_argument(
        "--version",
        default=None,
        help="Version candidate. Exemple : recommendation-v1.1.0"
    )
    parser.add_argument(
        "--config",
        default="configs/recommendation_model_config.json",
        help="Chemin du fichier de configuration."
    )

    args = parser.parse_args()

    version = args.version or build_default_version()
    config = load_config(args.config)

    input_file = Path(config["input_file"])
    report_dir = ensure_directory(config["report_dir"])
    output_dir = prepare_candidate_output_dir(version)

    if not input_file.exists():
        raise FileNotFoundError(f"Dataset introuvable: {input_file}")

    print(f"[INFO] Version candidate : {version}")
    print(f"[INFO] Output dir : {output_dir}")
    print(f"[INFO] Chargement dataset: {input_file}")

    df = pd.read_csv(
        input_file,
        dtype={
            "user_id": str,
            "event_id": str,
            "data_source": str,
            "event_category": str,
            "event_audience": str,
            "event_location_type": str,
            "event_status": str
        }
    )

    df = prepare_dataframe(
        df=df,
        categorical_features=config["categorical_features"],
        group_column=config["group_column"],
        target_column=config["target_column"]
    )

    print(f"[INFO] Nombre total de lignes: {len(df)}")
    print(f"[INFO] Nombre utilisateurs uniques: {df['user_id'].nunique()}")
    print(f"[INFO] Nombre événements uniques: {df['event_id'].nunique()}")

    print("[INFO] Distribution target_label:")
    print(df["target_label"].value_counts().sort_index())

    train_df, valid_df = split_by_user(
        df=df,
        validation_user_ratio=float(config["validation_user_ratio"]),
        random_state=int(config["random_state"])
    )

    print(f"[INFO] Train rows: {len(train_df)}")
    print(f"[INFO] Valid rows: {len(valid_df)}")
    print(f"[INFO] Train users: {train_df['user_id'].nunique()}")
    print(f"[INFO] Valid users: {valid_df['user_id'].nunique()}")

    feature_columns = build_feature_columns(
        df=df,
        drop_columns=config["drop_columns"]
    )

    categorical_features = [
        feature for feature in config["categorical_features"]
        if feature in feature_columns
    ]

    print("\n[INFO] Features utilisées:")
    for feature in feature_columns:
        print(f"  - {feature}")

    print("\n[INFO] Features catégorielles:")
    for feature in categorical_features:
        print(f"  - {feature}")

    train_pool = build_pool(train_df, feature_columns, categorical_features)
    valid_pool = build_pool(valid_df, feature_columns, categorical_features)

    model = CatBoostRanker(**config["model_params"])

    print("\n[INFO] Entraînement du modèle CatBoostRanker...")
    model.fit(
        train_pool,
        eval_set=valid_pool,
        use_best_model=True
    )

    valid_sorted = sort_for_ranking(valid_df)

    for column in categorical_features:
        valid_sorted[column] = valid_sorted[column].fillna("UNKNOWN").astype(str)

    predictions = model.predict(valid_sorted[feature_columns])

    metrics = evaluate_grouped(
        df=valid_sorted,
        predictions=predictions,
        k=5
    )

    best_score = model.get_best_score()

    metrics_output = {
        "version": version,
        "model_type": "CatBoostRanker",
        "status": "candidate",
        "input_file": str(input_file),
        "rows_total": int(len(df)),
        "rows_train": int(len(train_df)),
        "rows_validation": int(len(valid_df)),
        "users_train": int(train_df["user_id"].nunique()),
        "users_validation": int(valid_df["user_id"].nunique()),
        "events_total": int(df["event_id"].nunique()),
        "features": feature_columns,
        "categorical_features": categorical_features,
        "metrics": metrics,
        "catboost_best_score": best_score
    }

    model_path = output_dir / "catboost_recommender.cbm"
    features_path = output_dir / "features.json"
    metrics_artifact_path = output_dir / "metrics.json"
    model_card_path = output_dir / "model_card.md"
    metrics_report_path = report_dir / f"{version}_metrics.json"

    model.save_model(str(model_path))

    write_json(
        features_path,
        {
            "features": feature_columns,
            "categorical_features": categorical_features,
            "drop_columns": config["drop_columns"]
        }
    )

    write_json(metrics_artifact_path, metrics_output)
    write_json(metrics_report_path, metrics_output)

    write_model_card(
        path=model_card_path,
        version=version,
        metrics=metrics_output,
        training_rows=len(train_df),
        validation_rows=len(valid_df)
    )

    register_model_version(
        task="recommendation",
        version=version,
        model_name="CatBoostRanker",
        artifact_path=str(model_path),
        features_path=str(features_path),
        metrics_path=str(metrics_artifact_path),
        model_card_path=str(model_card_path),
        training_data_source="CapEvents PostgreSQL runtime dataset",
        metrics=metrics_output,
        status="candidate"
    )

    print("\n=== Training finished ===")
    print(f"Candidate version: {version}")
    print(f"Model: {model_path}")
    print(f"Features: {features_path}")
    print(f"Metrics artifact: {metrics_artifact_path}")
    print(f"Metrics report: {metrics_report_path}")
    print(f"Model card: {model_card_path}")
    print("\nValidation metrics:")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    print("\n[INFO] Candidate enregistrée dans models_artifacts/model_registry.json")
    print("[INFO] Elle n’est pas encore en production.")
    print(
        f"[INFO] Pour la promouvoir : "
        f"python -m training.promote_model --task recommendation --version {version}"
    )


if __name__ == "__main__":
    main()