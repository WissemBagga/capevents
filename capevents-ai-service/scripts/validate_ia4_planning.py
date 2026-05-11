import json
import os
import urllib.request
from pathlib import Path


AI_BASE_URL = os.getenv("AI_BASE_URL", "http://127.0.0.1:8001")
AI_SERVICE_KEY = os.getenv("AI_SERVICE_KEY", "change-me-secret-key")


def post_json(path: str, payload: dict) -> dict:
    request = urllib.request.Request(
        url=f"{AI_BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-ai-service-key": AI_SERVICE_KEY
        },
        method="POST"
    )

    with urllib.request.urlopen(request, timeout=240) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(path: str) -> dict:
    request = urllib.request.Request(
        url=f"{AI_BASE_URL}{path}",
        headers={
            "x-ai-service-key": AI_SERVICE_KEY
        },
        method="GET"
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def check_file(path: str) -> None:
    file_path = Path(path)

    if not file_path.exists():
        raise AssertionError(f"Fichier introuvable : {path}")

    print(f"OK fichier : {path}")


def validate_model_artifacts() -> None:
    check_file("datasets/processed/planning_train.csv")
    check_file("models_artifacts/model_registry.json")

    registry = json.loads(Path("models_artifacts/model_registry.json").read_text(encoding="utf-8"))

    planning = registry.get("models", {}).get("planning")

    if not planning:
        raise AssertionError("Aucun modèle planning dans model_registry.json")

    active_version = planning.get("active_version")

    if not active_version:
        raise AssertionError("Aucune version active pour planning")

    metadata = planning.get("versions", {}).get(active_version)

    if not metadata:
        raise AssertionError(f"Version active introuvable : {active_version}")

    if metadata.get("status") != "production":
        raise AssertionError(f"Le modèle actif n’est pas en production : {metadata.get('status')}")

    check_file(metadata["artifact_path"])
    check_file(metadata["features_path"])
    check_file(metadata["metrics_path"])

    print(f"OK modèle planning actif : {active_version}")


def validate_event_proposals() -> None:
    payload = {
        "reference_date": None,
        "target_department_id": None,
        "limit": 3,
        "slot_limit": 3,
        "days_horizon": 30
    }

    response = post_json("/ai/planning/event-proposals", payload)

    total = response.get("total_proposals", 0)
    items = response.get("items", [])
    model_info = response.get("model_info", {})

    if total < 1:
        raise AssertionError("Aucune proposition IA générée")

    if len(items) != total:
        raise AssertionError("total_proposals ne correspond pas au nombre d’items")

    strategy = model_info.get("strategy", "")

    if "catboost" not in strategy:
        raise AssertionError(f"Stratégie inattendue : {strategy}")

    for item in items:
        metrics = item.get("metrics", {})
        slots = item.get("suggested_slots", [])

        if not item.get("title"):
            raise AssertionError("Proposition sans titre")

        if not item.get("category"):
            raise AssertionError("Proposition sans catégorie")

        if not slots:
            raise AssertionError(f"Proposition sans créneaux : {item.get('title')}")

        if metrics.get("source") not in ["llm_generated_concept", "data_guardrail_supplement"]:
            raise AssertionError(f"Source proposition inattendue : {metrics.get('source')}")

    print(f"OK event-proposals : {total} proposition(s)")


def validate_monitoring() -> None:
    response = get_json("/ai/planning/monitoring/summary?days=30")

    required_fields = [
        "total_generations",
        "total_usage_events",
        "copied_count",
        "used_to_prefill_count",
        "created_from_ai_count",
        "usage_rate",
        "model_versions"
    ]

    for field in required_fields:
        if field not in response:
            raise AssertionError(f"Champ monitoring manquant : {field}")

    print("OK monitoring planning")


def main() -> None:
    print("\n=== Validation IA 4 Planning Intelligent ===\n")

    validate_model_artifacts()
    validate_event_proposals()
    validate_monitoring()

    print("\n=== IA 4 validée avec succès ===")


if __name__ == "__main__":
    main()