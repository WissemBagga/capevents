import argparse
import json
from pathlib import Path

import pandas as pd
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from training.model_registry import register_model_version, model_version_exists


DATASET_PATH = Path("datasets/processed/planning_train.csv")
CONFIG_PATH = Path("configs/planning_model_config.json")
ARTIFACTS_ROOT = Path("models_artifacts/planning/versions")


def load_config() -> dict:
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def prepare_dataset(df: pd.DataFrame, features: list[str], categorical_features: list[str], target: str) -> pd.DataFrame:
    df = df.copy()

    if "outcome_available" in df.columns:
        df = df[df["outcome_available"] == 1].copy()

    for column in features:
        if column not in df.columns:
            df[column] = "UNKNOWN" if column in categorical_features else 0

    for column in categorical_features:
        df[column] = df[column].fillna("UNKNOWN").astype(str)

    for column in features:
        if column not in categorical_features:
            df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

    df[target] = pd.to_numeric(df[target], errors="coerce").fillna(0).clip(0, 1)

    return df


def time_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    if "event_start_at" in df.columns:
        df = df.copy()
        df["event_start_at_dt"] = pd.to_datetime(df["event_start_at"], errors="coerce", utc=True)
        df = df.sort_values("event_start_at_dt").reset_index(drop=True)
    else:
        df = df.reset_index(drop=True)

    split_index = int(len(df) * 0.8)

    train_df = df.iloc[:split_index].copy()
    valid_df = df.iloc[split_index:].copy()

    return train_df, valid_df


def write_model_card(path: Path, version: str, metrics: dict) -> None:
    metrics_text = json.dumps(metrics, ensure_ascii=False, indent=2)

    path.write_text(
        f"""# Model Card — Planning Regressor {version}

## Modèle

CatBoostRegressor pour IA 4 Planning Intelligent.

## Objectif

Prédire un score de succès attendu pour un créneau d’événement.

## Target

success_score

Le score combine principalement :

- taux d’inscription ;
- taux de présence ;
- satisfaction moyenne.

## Données utilisées

Dataset : datasets/processed/planning_train.csv

## Statut

Version candidate.

Elle ne doit être promue en production qu’après validation des métriques.

## Métriques

{metrics_text}

## Limites

- Dataset encore enrichi/synthétique.
- Les signaux HIGH sont rares.
- Le modèle prédit un potentiel, il ne crée pas automatiquement l’événement.
- Le score final doit rester validé par un RH ou un manager.
""",
        encoding="utf-8"
    )

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Entraîner le modèle IA 4 Planning Intelligent."
    )

    parser.add_argument(
        "--version",
        required=True,
        help="Exemple : planning-regressor-v1.0.0"
    )

    args = parser.parse_args()
    version = args.version

    if model_version_exists("planning", version):
        raise ValueError(f"La version existe déjà : {version}")

    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset introuvable : {DATASET_PATH}")

    config = load_config()

    features = config["features"]
    categorical_features = config["categorical_features"]
    target = config["target"]

    df = pd.read_csv(DATASET_PATH)
    df = prepare_dataset(df, features, categorical_features, target)

    if len(df) < 100:
        raise RuntimeError("Dataset planning trop petit pour entraîner un modèle fiable.")

    train_df, valid_df = time_split(df)

    cat_feature_indexes = [
        features.index(column)
        for column in categorical_features
        if column in features
    ]

    train_pool = Pool(
        train_df[features],
        train_df[target],
        cat_features=cat_feature_indexes
    )

    valid_pool = Pool(
        valid_df[features],
        valid_df[target],
        cat_features=cat_feature_indexes
    )

    model = CatBoostRegressor(
        iterations=700,
        depth=6,
        learning_rate=0.04,
        loss_function="RMSE",
        eval_metric="RMSE",
        random_seed=42,
        verbose=100
    )

    model.fit(
        train_pool,
        eval_set=valid_pool,
        use_best_model=True
    )

    predictions = model.predict(valid_df[features])
    y_true = valid_df[target]

    mse = mean_squared_error(y_true, predictions)

    metrics = {
        "train_rows": int(len(train_df)),
        "valid_rows": int(len(valid_df)),
        "mae": float(mean_absolute_error(y_true, predictions)),
        "mse": float(mse),
        "rmse": float(mse ** 0.5),
        "r2": float(r2_score(y_true, predictions))
    }

    version_dir = ARTIFACTS_ROOT / version
    version_dir.mkdir(parents=True, exist_ok=True)

    model_path = version_dir / "planning_regressor.cbm"
    features_path = version_dir / "features.json"
    metrics_path = version_dir / "metrics.json"
    model_card_path = version_dir / "model_card.md"

    model.save_model(str(model_path))

    features_payload = {
        "target": target,
        "features": features,
        "categorical_features": categorical_features,
        "model_type": "CatBoostRegressor"
    }

    with features_path.open("w", encoding="utf-8") as file:
        json.dump(features_payload, file, ensure_ascii=False, indent=2)

    with metrics_path.open("w", encoding="utf-8") as file:
        json.dump(metrics, file, ensure_ascii=False, indent=2)

    write_model_card(model_card_path, version, metrics)

    register_model_version(
        task="planning",
        version=version,
        model_name="CatBoostRegressor",
        artifact_path=str(model_path),
        features_path=str(features_path),
        metrics_path=str(metrics_path),
        model_card_path=str(model_card_path),
        training_data_source="datasets/processed/planning_train.csv",
        metrics=metrics,
        status="candidate"
    )

    print("\n=== Planning Regressor trained ===")
    print(f"Version: {version}")
    print(f"Model: {model_path}")
    print(f"Metrics: {json.dumps(metrics, ensure_ascii=False, indent=2)}")


if __name__ == "__main__":
    main()