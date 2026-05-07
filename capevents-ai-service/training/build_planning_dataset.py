from pathlib import Path

import pandas as pd


INPUT_DIR = Path("datasets/raw/capevents")
OUTPUT_FILE = Path("datasets/processed/planning_train.csv")


def read_csv_if_exists(path: Path) -> pd.DataFrame:
    if not path.exists():
        print(f"[WARN] Fichier introuvable : {path}")
        return pd.DataFrame()

    return pd.read_csv(path)


def main() -> None:
    users = read_csv_if_exists(INPUT_DIR / "users.csv")
    departments = read_csv_if_exists(INPUT_DIR / "departments.csv")
    events = read_csv_if_exists(INPUT_DIR / "events.csv")
    registrations = read_csv_if_exists(INPUT_DIR / "event_registrations.csv")
    feedbacks = read_csv_if_exists(INPUT_DIR / "event_feedbacks.csv")
    invitations = read_csv_if_exists(INPUT_DIR / "event_invitations.csv")

    if events.empty:
        raise RuntimeError("events.csv est obligatoire pour construire le dataset planning.")

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    print("=== Planning dataset builder ===")
    print(f"Users: {len(users)}")
    print(f"Departments: {len(departments)}")
    print(f"Events: {len(events)}")
    print(f"Registrations: {len(registrations)}")
    print(f"Feedbacks: {len(feedbacks)}")
    print(f"Invitations: {len(invitations)}")

    # Le dataset complet sera construit dans l’étape suivante.
    # Cette étape vérifie seulement que les sources nécessaires existent.

    placeholder = pd.DataFrame({
        "status": ["SKELETON_READY"],
        "events_count": [len(events)],
        "registrations_count": [len(registrations)]
    })

    placeholder.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

    print(f"Skeleton dataset created: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()