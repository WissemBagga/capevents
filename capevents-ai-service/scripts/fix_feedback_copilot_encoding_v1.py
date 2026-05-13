from pathlib import Path
import shutil


BASE_DIR = Path(__file__).resolve().parents[1]

FILES_TO_FIX = [
    "app/api/feedback_insights.py",
    "app/services/feedback_insights_service.py",
    "app/schemas/feedback_insights.py",

    "app/api/hr_copilot.py",
    "app/api/hr_copilot_feedback.py",
    "app/api/copilot_monitoring.py",

    "app/services/hr_copilot_service.py",
    "app/services/copilot_logger.py",
    "app/services/copilot_monitoring_service.py",

    "app/schemas/hr_copilot.py",
    "app/schemas/copilot_feedback.py",
    "app/schemas/copilot_monitoring.py",
]

BACKUP_DIR = BASE_DIR / "tmp" / "backup_before_feedback_copilot_encoding_v1"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


MANUAL_REPLACEMENTS = {
    "Ã©": "é",
    "Ã¨": "è",
    "Ãª": "ê",
    "Ã ": "à",
    "Ã´": "ô",
    "Ã®": "î",
    "Ã§": "ç",
    "Ã‰": "É",
    "Ã€": "À",
    "Ãˆ": "È",
    "ÃŠ": "Ê",
    "â€™": "’",
    "â€”": "—",
    "Â«": "«",
    "Â»": "»",
    "Â ": " ",

    "Ã©vÃ©nement": "événement",
    "Ã©vÃ©nements": "événements",
    "Ã‰vÃ©nement": "Événement",
    "donnÃ©e": "donnée",
    "donnÃ©es": "données",
    "rÃ©sumÃ©": "résumé",
    "rÃ©sumÃ©s": "résumés",
    "rÃ©dige": "rédige",
    "rÃ©ponds": "réponds",
    "franÃ§ais": "français",
    "nÃ©gatif": "négatif",
    "nÃ©gatifs": "négatifs",
    "ThÃ¨me": "Thème",
    "thÃ¨mes": "thèmes",
    "amÃ©lioration": "amélioration",
    "rÃ©fÃ©rence": "référence",
    "dÃ©tectÃ©": "détecté",
    "dÃ©tectÃ©s": "détectés",
    "prÃ©cisÃ©": "précisé",
    "Ã©tÃ©": "été",
    "Ãªtre": "être",
    "trÃ¨s": "très",
    "souhaitÃ©s": "souhaités",

    "invitÃ©s": "invités",
    "rÃ©ponse": "réponse",
    "relanÃ§able": "relançable",
    "relanÃ§able(s)": "relançable(s)",
    "relancÃ©es": "relancées",
    "dÃ©jÃ": "déjà",
    "AmÃ©liorer": "Améliorer",
    "amÃ©liorer": "améliorer",
    "inscription": "inscription",
    "visibilitÃ©": "visibilité",
    "intÃ©ressÃ©s": "intéressés",
    "dÃ©partement": "département",
    "hÃ©sitantes": "hésitantes",
    "peut-Ãªtre": "peut-être",
    "crÃ©neau": "créneau",
    "bÃ©nÃ©fice": "bénéfice",
    "bÃ©nÃ©fices": "bénéfices",
    "adhÃ©sion": "adhésion",
    "infÃ©rieur": "inférieur",
    "auprÃ¨s": "auprès",
    "dÃ¨s": "dès",
}


TEXT_REPLACEMENTS = {
    "HR copilot suggestions generated successfully.": "Suggestions du Copilote RH générées avec succès.",
    "Feedback Copilote RH enregistrÃ©.": "Feedback Copilote RH enregistré.",
}


def fix_mojibake(text: str) -> str:
    fixed = text

    # Tentative globale si le fichier contient du mojibake.
    if any(marker in fixed for marker in ["Ã", "â", "Â"]):
        try:
            fixed = fixed.encode("cp1252").decode("utf-8")
        except Exception:
            pass

    for old, new in MANUAL_REPLACEMENTS.items():
        fixed = fixed.replace(old, new)

    for old, new in TEXT_REPLACEMENTS.items():
        fixed = fixed.replace(old, new)

    return fixed


def fix_file(relative_path: str) -> bool:
    path = BASE_DIR / relative_path

    if not path.exists():
        print(f"[SKIP] Introuvable : {relative_path}")
        return False

    backup_path = BACKUP_DIR / relative_path.replace("/", "__").replace("\\", "__")
    shutil.copy2(path, backup_path)

    original = path.read_text(encoding="utf-8")
    fixed = fix_mojibake(original)

    if fixed != original:
        path.write_text(fixed, encoding="utf-8")
        print(f"[FIXED] {relative_path}")
        return True

    print(f"[OK] {relative_path}")
    return False


def main() -> None:
    changed = 0

    for relative_path in FILES_TO_FIX:
        if fix_file(relative_path):
            changed += 1

    print("")
    print(f"Correction terminée. Fichiers modifiés : {changed}")
    print(f"Backups locaux : {BACKUP_DIR}")


if __name__ == "__main__":
    main()