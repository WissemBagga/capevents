import argparse

from training.model_registry import promote_model_version


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

    args = parser.parse_args()

    promote_model_version(
        task=args.task,
        version=args.version
    )

    print(f"Modèle promu en production : task={args.task}, version={args.version}")


if __name__ == "__main__":
    main()