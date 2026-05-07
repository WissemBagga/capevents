import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REGISTRY_PATH = Path("models_artifacts/model_registry.json")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_registry() -> dict[str, Any]:
    if not REGISTRY_PATH.exists():
        return {
            "schema_version": "1.0",
            "updated_at": utc_now(),
            "models": {}
        }

    with REGISTRY_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_registry(registry: dict[str, Any]) -> None:
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    registry["updated_at"] = utc_now()

    with REGISTRY_PATH.open("w", encoding="utf-8") as file:
        json.dump(registry, file, ensure_ascii=False, indent=2)


def register_model_version(
    task: str,
    version: str,
    model_name: str,
    artifact_path: str,
    features_path: str | None,
    metrics_path: str | None,
    model_card_path: str | None,
    training_data_source: str,
    metrics: dict[str, Any] | None = None,
    status: str = "candidate"
) -> None:
    registry = read_registry()

    models = registry.setdefault("models", {})
    task_entry = models.setdefault(task, {
        "active_version": None,
        "versions": {}
    })

    versions = task_entry.setdefault("versions", {})

    if version in versions:
        raise ValueError(
            f"La version {version} existe déjà pour la tâche {task}. "
            "Choisis une nouvelle version pour éviter d’écraser un modèle."
        )

    versions[version] = {
        "task": task,
        "version": version,
        "model_name": model_name,
        "artifact_path": artifact_path,
        "features_path": features_path,
        "metrics_path": metrics_path,
        "model_card_path": model_card_path,
        "training_data_source": training_data_source,
        "metrics": metrics or {},
        "status": status,
        "created_at": utc_now()
    }

    if status == "production":
        task_entry["active_version"] = version

    write_registry(registry)


def promote_model_version(task: str, version: str) -> None:
    registry = read_registry()

    task_entry = registry.get("models", {}).get(task)

    if not task_entry:
        raise ValueError(f"Tâche inconnue dans le registry : {task}")

    versions = task_entry.get("versions", {})

    if version not in versions:
        raise ValueError(f"Version inconnue pour {task} : {version}")

    for existing_version, metadata in versions.items():
        if metadata.get("status") == "production":
            metadata["status"] = "archived"

    versions[version]["status"] = "production"
    versions[version]["promoted_at"] = utc_now()
    task_entry["active_version"] = version

    write_registry(registry)


def get_active_model(task: str) -> dict[str, Any]:
    registry = read_registry()

    task_entry = registry.get("models", {}).get(task)

    if not task_entry:
        raise ValueError(f"Aucun modèle enregistré pour la tâche : {task}")

    active_version = task_entry.get("active_version")

    if not active_version:
        raise ValueError(f"Aucune version active pour la tâche : {task}")

    versions = task_entry.get("versions", {})

    if active_version not in versions:
        raise ValueError(f"Version active introuvable : {active_version}")

    return versions[active_version]

def model_version_exists(task: str, version: str) -> bool:
    registry = read_registry()

    task_entry = registry.get("models", {}).get(task)

    if not task_entry:
        return False

    versions = task_entry.get("versions", {})

    return version in versions    