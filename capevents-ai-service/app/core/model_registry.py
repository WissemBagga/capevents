import json
from pathlib import Path
from typing import Any


REGISTRY_PATH = Path("models_artifacts/model_registry.json")


class ModelRegistryError(RuntimeError):
    pass


def read_model_registry() -> dict[str, Any]:
    if not REGISTRY_PATH.exists():
        raise ModelRegistryError(
            f"Model registry introuvable : {REGISTRY_PATH}. "
            "Exécutez d'abord : python -m training.register_existing_recommendation_model"
        )

    with REGISTRY_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_active_model_metadata(task: str) -> dict[str, Any]:
    registry = read_model_registry()

    task_entry = registry.get("models", {}).get(task)

    if not task_entry:
        raise ModelRegistryError(
            f"Aucun modèle enregistré pour la tâche : {task}"
        )

    active_version = task_entry.get("active_version")

    if not active_version:
        raise ModelRegistryError(
            f"Aucune version active définie pour la tâche : {task}"
        )

    versions = task_entry.get("versions", {})
    metadata = versions.get(active_version)

    if not metadata:
        raise ModelRegistryError(
            f"La version active {active_version} est introuvable pour la tâche {task}"
        )

    if metadata.get("status") != "production":
        raise ModelRegistryError(
            f"La version active {active_version} n'est pas en statut production."
        )

    return metadata


def resolve_registry_path(path_value: str | None, required: bool = True) -> Path | None:
    if not path_value:
        if required:
            raise ModelRegistryError("Chemin d'artefact manquant dans le registry.")
        return None

    path = Path(path_value)

    if not path.exists():
        raise ModelRegistryError(f"Fichier artefact introuvable : {path}")

    return path