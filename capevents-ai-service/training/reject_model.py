import argparse

from training.model_registry import update_model_status


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Marquer une version de modèle comme rejected."
    )

    parser.add_argument("--task", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--reason", default="Candidate rejected.")

    args = parser.parse_args()

    update_model_status(
        task=args.task,
        version=args.version,
        status="rejected",
        reason=args.reason
    )

    print(f"Version rejetée : task={args.task}, version={args.version}")


if __name__ == "__main__":
    main()