import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from catboost import CatBoostRanker, Pool


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

    # Le ranker préfère des labels non négatifs.
    # Les -1 deviennent 0.
    df["target_label"] = pd.to_numeric(
        df[target_column],
        errors="coerce"
    ).fillna(0).clip(lower=0)

    # Colonnes qui doivent absolument rester en texte.
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
    # Important : les lignes d’un même user doivent être groupées.
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

    # Sécurité : convertir explicitement les colonnes catégorielles en string.
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
    config = load_config()

    input_file = Path(config["input_file"])
    artifact_dir = ensure_directory(config["artifact_dir"])
    report_dir = ensure_directory(config["report_dir"])

    if not input_file.exists():
        raise FileNotFoundError(f"Dataset introuvable: {input_file}")

    print(f"[INFO] Chargement dataset: {input_file}")

    # Important : charger les IDs en texte pour éviter que pandas casse les UUID.
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

    # Sécurité : s'assurer que les colonnes catégorielles sont encore string avant predict.
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
        "model_type": "CatBoostRanker",
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

    model_path = artifact_dir / "catboost_recommender.cbm"
    features_path = artifact_dir / "features.json"
    metrics_artifact_path = artifact_dir / "metrics.json"
    metrics_report_path = report_dir / "metrics.json"

    model.save_model(str(model_path))

    with features_path.open("w", encoding="utf-8") as file:
        json.dump(
            {
                "features": feature_columns,
                "categorical_features": categorical_features,
                "drop_columns": config["drop_columns"]
            },
            file,
            indent=2,
            ensure_ascii=False
        )

    with metrics_artifact_path.open("w", encoding="utf-8") as file:
        json.dump(metrics_output, file, indent=2, ensure_ascii=False)

    with metrics_report_path.open("w", encoding="utf-8") as file:
        json.dump(metrics_output, file, indent=2, ensure_ascii=False)

    print("\n=== Training finished ===")
    print(f"Model: {model_path}")
    print(f"Features: {features_path}")
    print(f"Metrics artifact: {metrics_artifact_path}")
    print(f"Metrics report: {metrics_report_path}")
    print("\nValidation metrics:")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()