from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parents[1]

FILES_TO_FIX = [
    "app/services/planning_service.py",
    "app/services/planning_ideation_service.py",
    "app/services/planning_llm_client.py",
    "app/services/planning_monitoring_service.py",
    "app/schemas/planning.py",
    "app/api/planning.py",
    "docs/ai/planning-intelligent.md",
    "models_artifacts/planning/README.md",
]

BACKUP_DIR = BASE_DIR / "tmp" / "backup_before_remaining_planning_mojibake_v1"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def fix_mojibake_line(line: str) -> str:
    if not any(marker in line for marker in ["Ã", "â", "Â"]):
        return line

    try:
        fixed = line.encode("cp1252").decode("utf-8")
        return fixed
    except Exception:
        return line


def fix_manual(text: str) -> str:
    replacements = {
        "Ã©": "é",
        "Ã¨": "è",
        "Ãª": "ê",
        "Ã«": "ë",
        "Ã ": "à",
        "Ã¢": "â",
        "Ã´": "ô",
        "Ã®": "î",
        "Ã¯": "ï",
        "Ã§": "ç",
        "Ã‰": "É",
        "Ãˆ": "È",
        "ÃŠ": "Ê",
        "Ã€": "À",
        "â€™": "’",
        "â€œ": "“",
        "â€": "”",
        "â€”": "—",
        "Â«": "«",
        "Â»": "»",
        "Â ": " ",
        "ConfÃ©rence": "Conférence",
        "Bien-Ãªtre": "Bien-être",
        "Culture dâ€™entreprise": "Culture d’entreprise",
        "stratÃ©gique": "stratégique",
        "amÃ©lioration": "amélioration",
        "inter-Ã©quipes": "inter-équipes",
        "Ã©quipes": "équipes",
        "Ãchanger": "Échanger",
        "matiÃ¨re": "matière",
        "qualitÃ©": "qualité",
        "rÃ©el": "réel",
        "numÃ©riques": "numériques",
        "compÃ©tences": "compétences",
        "donnÃ©es": "données",
        "crÃ©neau": "créneau",
        "crÃ©neaux": "créneaux",
        "catÃ©gorie": "catégorie",
        "catÃ©gories": "catégories",
        "Ã©vÃ©nement": "événement",
        "Ã©vÃ©nements": "événements",
        "prÃ©sence": "présence",
        "modÃ¨le": "modèle",
        "mÃ©tier": "métier",
        "gÃ©nÃ©r": "génér",
        "dÃ©partement": "département",
    }

    fixed = text
    for old, new in replacements.items():
        fixed = fixed.replace(old, new)

    return fixed


def fix_file(relative_path: str) -> bool:
    path = BASE_DIR / relative_path

    if not path.exists():
        print(f"[SKIP] {relative_path}")
        return False

    backup_path = BACKUP_DIR / relative_path.replace("/", "__").replace("\\", "__")
    shutil.copy2(path, backup_path)

    original = path.read_text(encoding="utf-8")

    lines = original.splitlines(keepends=True)
    fixed = "".join(fix_mojibake_line(line) for line in lines)
    fixed = fix_manual(fixed)

    if fixed != original:
        path.write_text(fixed, encoding="utf-8")
        print(f"[FIXED] {relative_path}")
        return True

    print(f"[OK] {relative_path}")
    return False


def main():
    changed = 0

    for file_path in FILES_TO_FIX:
        if fix_file(file_path):
            changed += 1

    print(f"Fichiers modifiés: {changed}")
    print(f"Backup: {BACKUP_DIR}")


if __name__ == "__main__":
    main()