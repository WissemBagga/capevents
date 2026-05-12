from pathlib import Path
import csv
import shutil

BASE_DIR = Path(__file__).resolve().parents[1]

CLEAN_DIR = BASE_DIR / "datasets" / "clean" / "capevents_v1"
REJECTED_DIR = BASE_DIR / "datasets" / "rejected" / "capevents_v1"
REPORTS_DIR = BASE_DIR / "datasets" / "reports"
BACKUP_DIR = BASE_DIR / "datasets" / "clean" / "_backup_before_fix_self_invitations"

INVITATIONS_FILE = CLEAN_DIR / "event_invitations.csv"
ERRORS_FILE = REPORTS_DIR / "data_quality_errors_v1.csv"
REJECTED_FILE = REJECTED_DIR / "event_invitations_self_invitations_rejected.csv"

REJECTED_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def sniff_delimiter(path: Path) -> str:
    sample = path.read_text(encoding="utf-8-sig", errors="ignore")[:4096]
    try:
        return csv.Sniffer().sniff(sample).delimiter
    except Exception:
        return ","


def load_self_invitation_ids():
    ids = set()

    with ERRORS_FILE.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (
                row.get("table") == "event_invitations"
                and row.get("severity") == "ERROR"
                and row.get("code") == "SELF_INVITATION"
            ):
                ids.add(row.get("key"))

    return ids


def main():
    if not INVITATIONS_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {INVITATIONS_FILE}")

    if not ERRORS_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable: {ERRORS_FILE}")

    # Backup avant modification
    backup_file = BACKUP_DIR / "event_invitations.csv"
    shutil.copy2(INVITATIONS_FILE, backup_file)

    invalid_ids = load_self_invitation_ids()

    if not invalid_ids:
        print("Aucune auto-invitation à corriger.")
        return

    delimiter = sniff_delimiter(INVITATIONS_FILE)

    with INVITATIONS_FILE.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        fieldnames = reader.fieldnames
        rows = list(reader)

    clean_rows = []
    rejected_rows = []

    for row in rows:
        if row.get("id") in invalid_ids:
            rejected_rows.append(row)
        else:
            clean_rows.append(row)

    with INVITATIONS_FILE.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=delimiter)
        writer.writeheader()
        writer.writerows(clean_rows)

    with REJECTED_FILE.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=delimiter)
        writer.writeheader()
        writer.writerows(rejected_rows)

    print("Correction terminée.")
    print(f"Lignes supprimées de clean: {len(rejected_rows)}")
    print(f"Lignes restantes dans clean: {len(clean_rows)}")
    print(f"Backup: {backup_file}")
    print(f"Lignes rejetées: {REJECTED_FILE}")


if __name__ == "__main__":
    main()