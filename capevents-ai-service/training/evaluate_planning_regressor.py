import json
from pathlib import Path

import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


DATASET_PATH = Path("datasets/processed/planning_train.csv")
MODEL_DIR = Path("models_artifacts/planning/versions/planning-regressor-v1.0.0")
MODEL_PATH = MODEL_DIR / "planning_regressor.cbm"
FEATURES_PATH = MODEL_DIR / "features.json"
REPORT_PATH = MODEL_DIR / "evaluation_report.json"


def time_split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = df.copy()

    if "event_start_at" in df.columns:
        df["event_start_at_dt"] = pd.to_datetime(df["event_start_at"], errors="coerce", utc=True)
        df = df.sort_values("event_start_at_dt").reset_index(drop=True)

    split_index = int(len(df) * 0.8)
    return df.iloc[:split_index].copy(), df.iloc[split_index:].copy()


def metrics(y_true, y_pred) -> dict:
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mse": float(mean_squared_error(y_true, y_pred)),
        "rmse": float(mean_squared_error(y_true, y_pred) ** 0.5),
        "r2": float(r2_score(y_true, y_pred))
    }


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(DATASET_PATH)

    if not MODEL_PATH.exists():
        raise FileNotFoundError(MODEL_PATH)

    with FEATURES_PATH.open("r", encoding="utf-8") as file:
        features_payload = json.load(file)

    features = features_payload["features"]
    categorical_features = features_payload["categorical_features"]
    target = features_payload["target"]

    df = pd.read_csv(DATASET_PATH)

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

    train_df, valid_df = time_split(df)

    model = CatBoostRegressor()
    model.load_model(str(MODEL_PATH))

    y_true = valid_df[target]
    model_pred = model.predict(valid_df[features])

    mean_baseline = [train_df[target].mean()] * len(valid_df)

    category_means = train_df.groupby("event_category")[target].mean().to_dict()
    global_mean = train_df[target].mean()

    category_baseline = valid_df["event_category"].map(category_means).fillna(global_mean)

    report = {
        "model_version": "planning-regressor-v1.0.0",
        "train_rows": int(len(train_df)),
        "valid_rows": int(len(valid_df)),
        "catboost": metrics(y_true, model_pred),
        "mean_baseline": metrics(y_true, mean_baseline),
        "category_baseline": metrics(y_true, category_baseline),
        "decision": None
    }

    catboost_rmse = report["catboost"]["rmse"]
    baseline_rmse = min(
        report["mean_baseline"]["rmse"],
        report["category_baseline"]["rmse"]
    )

    if catboost_rmse < baseline_rmse:
        report["decision"] = "CATBOOST_BETTER_THAN_BASELINE"
    else:
        report["decision"] = "KEEP_HYBRID_BASELINE_FOR_NOW"

    with REPORT_PATH.open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)

    print("\n=== Planning Regressor Evaluation ===")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nReport saved to: {REPORT_PATH}")


if __name__ == "__main__":
    main()