from pathlib import Path
import csv
import shutil

BASE_DIR = Path(__file__).resolve().parents[1]

CLEAN_DIR = BASE_DIR / "datasets" / "clean" / "capevents_v1"
REPORTS_DIR = BASE_DIR / "datasets" / "reports"
BACKUP_DIR = BASE_DIR / "datasets" / "clean" / "_backup_before_fix_remaining_warnings_v1"

USERS_FILE = CLEAN_DIR / "users.csv"
ERRORS_FILE = REPORTS_DIR / "data_quality_errors_v1.csv"

BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def sniff_delimiter(path: Path) -> str:
    sample = path.read_text(encoding="utf-8-sig", errors="ignore")[:4096]
    try:
        return csv.Sniffer().sniff(sample).delimiter
    except Exception:
        return ","


def read_csv(path: Path):
    delimiter = sniff_delimiter(path)
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        return list(reader), reader.fieldnames, delimiter


def write_csv(path: Path, rows, fieldnames, delimiter=","):
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=delimiter)
        writer.writeheader()
        writer.writerows(rows)


def load_invalid_phone_user_ids():
    user_ids = set()

    with ERRORS_FILE.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (
                row.get("table") == "users"
                and row.get("severity") == "WARNING"
                and row.get("code") == "INVALID_PHONE"
            ):
                user_ids.add(row.get("key"))

    return user_ids


def main():
    invalid_user_ids = load_invalid_phone_user_ids()

    if not invalid_user_ids:
        print("Aucun téléphone invalide à corriger.")
        return

    shutil.copy2(USERS_FILE, BACKUP_DIR / "users.csv")

    rows, fieldnames, delimiter = read_csv(USERS_FILE)

    fixed = 0

    for row in rows:
        if row.get("id") in invalid_user_ids:
            row["phone"] = ""
            fixed += 1

    write_csv(USERS_FILE, rows, fieldnames, delimiter)

    print("Correction terminée.")
    print(f"Téléphones invalides vidés: {fixed}")
    print(f"Backup: {BACKUP_DIR / 'users.csv'}")


if __name__ == "__main__":
    main()