from pathlib import Path
import csv
import shutil
import re
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parents[1]

CLEAN_DIR = BASE_DIR / "datasets" / "clean" / "capevents_v1"
REJECTED_DIR = BASE_DIR / "datasets" / "rejected" / "capevents_v1"
BACKUP_DIR = BASE_DIR / "datasets" / "clean" / "_backup_before_fix_warnings_v1"
REPORTS_DIR = BASE_DIR / "datasets" / "reports"

USERS_FILE = CLEAN_DIR / "users.csv"
USER_INTERESTS_FILE = CLEAN_DIR / "user_interests.csv"

REJECTED_INTERESTS_FILE = REJECTED_DIR / "user_interests_extra_rejected.csv"
FIX_REPORT = REPORTS_DIR / "warnings_fix_report_v1.md"

PHONE_RE = re.compile(r"^\+216\d{8}$")

REJECTED_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


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


def normalize_phone(phone: str) -> str:
    if phone is None:
        return ""

    value = phone.strip()
    if not value:
        return value

    value = value.replace(" ", "").replace("-", "").replace(".", "")

    if value.startswith("00216"):
        value = "+216" + value[5:]

    if value.startswith("216") and not value.startswith("+216"):
        value = "+" + value

    if re.fullmatch(r"\d{8}", value):
        value = "+216" + value

    return value


def infer_department(row) -> str:
    text = " ".join([
        row.get("job_title", ""),
        row.get("email", ""),
        row.get("first_name", ""),
        row.get("last_name", "")
    ]).lower()

    if any(x in text for x in ["rh", "ressources humaines", "responsable rh", "hr"]):
        return "2"

    if any(x in text for x in ["finance", "comptable", "contrôleur", "controleur"]):
        return "3"

    if "marketing" in text:
        return "4"

    if any(x in text for x in ["vente", "commercial"]):
        return "5"

    if any(x in text for x in ["développement", "developpement"]):
        return "6"

    if "iot" in text:
        return "7"

    if any(x in text for x in ["qualité", "qualite"]):
        return "8"

    if "support" in text:
        return "9"

    if any(x in text for x in ["juridique", "juriste"]):
        return "10"

    if any(x in text for x in ["achat", "achats", "acheteur"]):
        return "11"

    if any(x in text for x in ["communication"]):
        return "12"

    if any(x in text for x in [
        "informatique", "développeur", "developpeur", "logiciel",
        "back-end", "backend", "front-end", "frontend", "full-stack",
        "fullstack", "it", "java", "angular"
    ]):
        return "1"

    # Valeur par défaut seulement dans clean, jamais dans raw.
    return "1"


def fix_user_interests():
    shutil.copy2(USER_INTERESTS_FILE, BACKUP_DIR / "user_interests.csv")

    rows, fieldnames, delimiter = read_csv(USER_INTERESTS_FILE)

    kept_rows = []
    rejected_rows = []

    count_by_user = defaultdict(int)

    for row in rows:
        user_id = row.get("user_id", "").strip()

        if count_by_user[user_id] < 6:
            kept_rows.append(row)
            count_by_user[user_id] += 1
        else:
            rejected_rows.append(row)

    write_csv(USER_INTERESTS_FILE, kept_rows, fieldnames, delimiter)
    write_csv(REJECTED_INTERESTS_FILE, rejected_rows, fieldnames, delimiter)

    return len(rows), len(kept_rows), len(rejected_rows)


def fix_users():
    shutil.copy2(USERS_FILE, BACKUP_DIR / "users.csv")

    rows, fieldnames, delimiter = read_csv(USERS_FILE)

    fixed_job_title = 0
    fixed_phone = 0
    fixed_department = 0
    still_invalid_phone = 0

    for row in rows:
        # 1. Poste manquant
        if not row.get("job_title", "").strip():
            row["job_title"] = "Collaborateur"
            fixed_job_title += 1

        # 2. Téléphone invalide simple
        phone = row.get("phone", "")
        if phone.strip():
            normalized = normalize_phone(phone)
            if normalized != phone:
                row["phone"] = normalized
                fixed_phone += 1

            if row["phone"].strip() and not PHONE_RE.match(row["phone"].strip()):
                still_invalid_phone += 1

        # 3. Département manquant
        department = row.get("department_id", "").strip()
        if department == "" or department.lower() in {"null", "none", "nan"}:
            row["department_id"] = infer_department(row)
            fixed_department += 1

    write_csv(USERS_FILE, rows, fieldnames, delimiter)

    return {
        "fixed_job_title": fixed_job_title,
        "fixed_phone": fixed_phone,
        "fixed_department": fixed_department,
        "still_invalid_phone": still_invalid_phone,
    }


def main():
    print("Correction warnings v1 - mode clean uniquement")

    ui_before, ui_after, ui_rejected = fix_user_interests()
    user_stats = fix_users()

    with FIX_REPORT.open("w", encoding="utf-8") as f:
        f.write("# CapEvents - Warnings Fix Report v1\n\n")
        f.write("Mode: correction uniquement dans `datasets/clean/capevents_v1`.\n")
        f.write("Aucun fichier `raw` et aucune base PostgreSQL n'ont été modifiés.\n\n")

        f.write("## user_interests.csv\n\n")
        f.write(f"- Lignes avant : {ui_before}\n")
        f.write(f"- Lignes conservées : {ui_after}\n")
        f.write(f"- Lignes déplacées vers rejected : {ui_rejected}\n\n")

        f.write("## users.csv\n\n")
        f.write(f"- Postes manquants corrigés : {user_stats['fixed_job_title']}\n")
        f.write(f"- Téléphones normalisés : {user_stats['fixed_phone']}\n")
        f.write(f"- Départements manquants corrigés : {user_stats['fixed_department']}\n")
        f.write(f"- Téléphones encore invalides : {user_stats['still_invalid_phone']}\n\n")

        f.write("## Fichiers de sauvegarde\n\n")
        f.write(f"- `{BACKUP_DIR / 'users.csv'}`\n")
        f.write(f"- `{BACKUP_DIR / 'user_interests.csv'}`\n\n")

        f.write("## Fichiers rejected\n\n")
        f.write(f"- `{REJECTED_INTERESTS_FILE}`\n")

    print("Correction terminée.")
    print(f"user_interests rejetés: {ui_rejected}")
    print(f"postes corrigés: {user_stats['fixed_job_title']}")
    print(f"téléphones normalisés: {user_stats['fixed_phone']}")
    print(f"départements corrigés: {user_stats['fixed_department']}")
    print(f"rapport: {FIX_REPORT}")


if __name__ == "__main__":
    main()