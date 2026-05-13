from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parents[1]

FILES_TO_FIX = [
    "app/api/planning.py",
    "app/services/planning_service.py",
    "app/services/planning_ideation_service.py",
    "app/services/planning_llm_client.py",
    "app/services/planning_monitoring_service.py",
    "app/schemas/planning.py",
    "training/build_planning_dataset.py",
    "training/train_planning_regressor.py",
    "models_artifacts/planning/README.md",
    "docs/ai/planning-intelligent.md",
]

BACKUP_DIR = BASE_DIR / "tmp" / "backup_before_planning_encoding_fix_v1"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

REPLACEMENTS = {
    "Ã©": "é",
    "Ã¨": "è",
    "Ãª": "ê",
    "Ã ": "à",
    "Ã´": "ô",
    "Ã®": "î",
    "Ã§": "ç",
    "Ã‰": "É",
    "Ãˆ": "È",
    "ÃŠ": "Ê",
    "Ã€": "À",
    "â€™": "’",
    "â€”": "—",
    "Â«": "«",
    "Â»": "»",
    "Â ": " ",
    "dâ€™": "d’",
    "lâ€™": "l’",
    "nâ€™": "n’",
    "quâ€™": "qu’",
    "cÃ´tÃ©": "côté",
    "dÃ©jÃ": "déjà",
    "mÃªme": "même",
    "modÃ¨le": "modèle",
    "donnÃ©es": "données",
    "Ã©vÃ©nement": "événement",
    "Ã©vÃ©nements": "événements",
    "catÃ©gorie": "catégorie",
    "catÃ©gories": "catégories",
    "crÃ©neau": "créneau",
    "crÃ©neaux": "créneaux",
    "prÃ©sence": "présence",
    "prÃ©sent": "présent",
    "gÃ©nÃ©ration": "génération",
    "gÃ©nÃ¨re": "génère",
    "gÃ©nÃ©rÃ©": "généré",
    "gÃ©nÃ©rÃ©e": "générée",
    "spÃ©cifique": "spécifique",
    "prÃ©cis": "précis",
    "mÃ©tier": "métier",
    "adaptÃ©": "adapté",
    "dÃ©partement": "département",
    "dÃ©tectÃ©": "détecté",
    "pÃ©nalisÃ©": "pénalisé",
    "Ã©levÃ©": "élevé",
    "opÃ©rationnel": "opérationnel",
    "opÃ©rationnelle": "opérationnelle",
    "responsabilitÃ©": "responsabilité",
    "crÃ©ativitÃ©": "créativité",
    "santÃ©": "santé",
    "rÃ©seau": "réseau",
    "RÃ‰SEAU": "RÉSEAU",
    "ConfÃ©rence": "Conférence",
    "CONFÃ‰RENCE": "CONFÉRENCE",
    "Bien-Ãªtre": "Bien-être",
    "BIEN-ÃŠTRE": "BIEN-ÊTRE",
    "Culture dâ€™entreprise": "Culture d’entreprise",
    "CULTURE Dâ€™ENTREPRISE": "CULTURE D’ENTREPRISE",
}

def fix_file(relative_path: str) -> bool:
    path = BASE_DIR / relative_path

    if not path.exists():
        print(f"[SKIP] Introuvable: {relative_path}")
        return False

    backup_path = BACKUP_DIR / relative_path.replace("/", "__").replace("\\", "__")
    shutil.copy2(path, backup_path)

    content = path.read_text(encoding="utf-8")
    fixed = content

    for old, new in REPLACEMENTS.items():
        fixed = fixed.replace(old, new)

    if fixed != content:
        path.write_text(fixed, encoding="utf-8")
        print(f"[FIXED] {relative_path}")
        return True

    print(f"[OK] {relative_path}")
    return False

def main():
    changed = 0

    for relative_path in FILES_TO_FIX:
        if fix_file(relative_path):
            changed += 1

    print(f"\nCorrection terminée. Fichiers modifiés: {changed}")
    print(f"Backups locaux: {BACKUP_DIR}")

if __name__ == "__main__":
    main()