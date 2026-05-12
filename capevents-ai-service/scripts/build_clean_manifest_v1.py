from pathlib import Path
import csv
import json
import hashlib
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parents[1]

CLEAN_DIR = BASE_DIR / "datasets" / "clean" / "capevents_v1"
REPORTS_DIR = BASE_DIR / "datasets" / "reports"
MANIFEST_FILE = REPORTS_DIR / "export_manifest_clean_v1.json"

FILES = [
    "departments.csv",
    "users.csv",
    "events.csv",
    "event_registrations.csv",
    "event_invitations.csv",
    "event_invitation_reminders.csv",
    "event_feedbacks.csv",
    "interests.csv",
    "user_interests.csv",
    "points_transactions.csv",
    "user_badges.csv",
]


def count_rows(path: Path) -> int:
    if not path.exists():
        return 0

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return sum(1 for _ in reader)


def file_sha256(path: Path) -> str:
    if not path.exists():
        return ""

    sha = hashlib.sha256()

    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha.update(chunk)

    return sha.hexdigest()


def main():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    datasets = []

    for file_name in FILES:
        path = CLEAN_DIR / file_name

        datasets.append({
            "dataset": file_name.replace(".csv", ""),
            "status": "CLEANED",
            "rows": count_rows(path),
            "path": str(path.relative_to(BASE_DIR)).replace("\\", "/"),
            "sha256": file_sha256(path),
        })

    manifest = {
        "version": "clean_v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "datasets/raw/capevents",
        "clean_target": "datasets/clean/capevents_v1",
        "mode": "non_destructive",
        "database_modified": False,
        "datasets": datasets,
    }

    with MANIFEST_FILE.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Manifest créé: {MANIFEST_FILE}")


if __name__ == "__main__":
    main()