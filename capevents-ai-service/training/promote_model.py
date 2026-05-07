import argparse

from training.model_registry import promote_model_version, read_registry


def get_model_status(task: str, version: str) -> str | None:
    registry = read_registry()

    task_entry = registry.get("models", {}).get(task)
    if not task_entry:
        return None

    version_entry = task_entry.get("versions", {}).get(version)
    if not version_entry:
        return None

    return version_entry.get("status")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Promouvoir une version de modèle en production."
    )

    parser.add_argument(
        "--task",
        required=True,
        help="Nom de la tâche IA. Exemple : recommendation, planning."
    )

    parser.add_argument(
        "--version",
        required=True,
        help="Version du modèle à promouvoir. Exemple : recommendation-v1.0.0."
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Forcer la promotion après validation manuelle ou rollback contrôlé."
    )

    args = parser.parse_args()

    status = get_model_status(args.task, args.version)

    if status is None:
        raise ValueError(
            f"Version introuvable : task={args.task}, version={args.version}"
        )

    if args.task == "recommendation" and status == "candidate" and not args.force:
        raise ValueError(
            "Promotion bloquée : cette version est encore candidate. "
            "Compare d’abord la candidate avec la production : "
            f"python -m training.compare_recommendation_candidate --candidate-version {args.version} --auto-reject "
            "Si elle est meilleure, relance ensuite avec --force."
        )

    promote_model_version(
        task=args.task,
        version=args.version
    )

    print(f"Modèle promu en production : task={args.task}, version={args.version}")


if __name__ == "__main__":
    main()