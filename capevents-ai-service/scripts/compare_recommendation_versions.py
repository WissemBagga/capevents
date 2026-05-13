from pathlib import Path
import json


BASE_DIR = Path(__file__).resolve().parents[1]

VERSIONS_DIR = BASE_DIR / "models_artifacts" / "recommendation" / "versions"
LEGACY_METRICS = BASE_DIR / "models_artifacts" / "recommendation" / "metrics.json"
OUTPUT_FILE = BASE_DIR / "reports" / "recommendation" / "recommendation_versions_comparison.json"


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def extract_metrics(payload: dict) -> dict:
    metrics = payload.get("metrics", payload)

    return {
        "precision_at_5": metrics.get("precision_at_5"),
        "recall_at_5": metrics.get("recall_at_5"),
        "ndcg_at_5": metrics.get("ndcg_at_5"),
        "evaluated_users": metrics.get("evaluated_users"),
        "evaluated_rows": metrics.get("evaluated_rows"),
    }


def main():
    results = []

    if LEGACY_METRICS.exists():
        payload = load_json(LEGACY_METRICS)
        results.append({
            "version": "recommendation-v1.0.0",
            "source": str(LEGACY_METRICS.relative_to(BASE_DIR)),
            **extract_metrics(payload),
        })

    if VERSIONS_DIR.exists():
        for version_dir in sorted(VERSIONS_DIR.iterdir()):
            metrics_path = version_dir / "metrics.json"
            if not metrics_path.exists():
                continue

            payload = load_json(metrics_path)
            results.append({
                "version": version_dir.name,
                "source": str(metrics_path.relative_to(BASE_DIR)),
                **extract_metrics(payload),
            })

    results = sorted(
        results,
        key=lambda item: (
            item.get("ndcg_at_5") is not None,
            item.get("ndcg_at_5") or 0,
            item.get("precision_at_5") or 0,
        ),
        reverse=True,
    )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n=== Recommendation versions comparison ===")
    for row in results:
        print(
            f"{row['version']} | "
            f"precision@5={row.get('precision_at_5')} | "
            f"recall@5={row.get('recall_at_5')} | "
            f"ndcg@5={row.get('ndcg_at_5')} | "
            f"users={row.get('evaluated_users')}"
        )

    print(f"\nReport: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()