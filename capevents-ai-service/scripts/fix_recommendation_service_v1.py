from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parents[1]
SERVICE_FILE = BASE_DIR / "app" / "services" / "recommendation_service.py"
BACKUP_DIR = BASE_DIR / "app" / "services" / "_backup_before_recommendation_fix_v1"

BACKUP_DIR.mkdir(parents=True, exist_ok=True)


REPLACEMENTS = {
    "Bien-Ãªtre": "Bien-être",
    "ConfÃ©rence": "Conférence",
    "Culture dâ€™entreprise": "Culture d’entreprise",
    "Impossible de charger le modÃ¨le": "Impossible de charger le modèle",
    "Aucun Ã©vÃ©nement": "Aucun événement",
    "Le modÃ¨le": "Le modèle",
    "nâ€™est pas chargÃ©": "n’est pas chargé",
    "prioritÃ©": "priorité",
    "Ã©vÃ©nements": "événements",
    "Ã©vÃ©nement": "événement",
    "Ã©vite": "évite",
    "dÃ©passÃ©e": "dépassée",
    "contrÃ´lÃ©": "contrôlé",
    "nâ€™est disponible": "n’est disponible",
    "rÃ¨gles": "règles",
    "rÃ©ponse": "réponse",
    "Correspond Ã ": "Correspond à",
    "centres dâ€™intÃ©rÃªt": "centres d’intérêt",
    "liÃ©s Ã ": "liés à",
    "AdaptÃ© Ã ": "Adapté à",
    "dÃ©partement": "département",
    "Ouvert Ã ": "Ouvert à",
    "dÃ©jÃ ": "déjà",
    "rÃ©pondu": "répondu",
    "positivement Ã ": "positivement à",
    "montrÃ©": "montré",
    "intÃ©rÃªt": "intérêt",
    "possible pour cet Ã©vÃ©nement": "possible pour cet événement",
    "Ã©tÃ© invitÃ© Ã ": "été invité à",
    "Ã‰vÃ©nement": "Événement",
    "notÃ©": "noté",
    "dÃ©jÃ  attractif": "déjà attractif",
    "prÃ©vu": "prévu",
    "prochainement": "prochainement",
    "activitÃ©": "activité",
    "engagÃ©": "engagé",
    "Ã©vÃ©nement selon le modÃ¨le IA": "événement selon le modèle IA",
    "On limite Ã ": "On limite à",
    "lisible cÃ´tÃ© Angular": "lisible côté Angular",
    "Aucune feature trouvÃ©e": "Aucune feature trouvée",
}


def indent_reminder_method_inside_class(content: str) -> str:
    marker = "\ndef _get_invitation_reminder_features(self, user_id: str, event_id: str) -> dict:"
    if marker not in content:
        return content

    before, after = content.split(marker, 1)

    method_block = "def _get_invitation_reminder_features(self, user_id: str, event_id: str) -> dict:" + after
    indented_block = "\n".join(
        "    " + line if line.strip() else line
        for line in method_block.splitlines()
    )

    return before.rstrip() + "\n\n" + indented_block + "\n"


def main():
    if not SERVICE_FILE.exists():
        raise FileNotFoundError(SERVICE_FILE)

    backup_file = BACKUP_DIR / "recommendation_service.py"
    shutil.copy2(SERVICE_FILE, backup_file)

    content = SERVICE_FILE.read_text(encoding="utf-8")

    for old, new in REPLACEMENTS.items():
        content = content.replace(old, new)

    content = indent_reminder_method_inside_class(content)

    SERVICE_FILE.write_text(content, encoding="utf-8")

    print("Correction recommendation_service.py terminée.")
    print(f"Backup: {backup_file}")


if __name__ == "__main__":
    main()