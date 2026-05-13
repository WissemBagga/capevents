from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parents[1]

FILES_TO_FIX = [
    "training/build_recommendation_dataset.py",
    "training/train_recommendation_model.py",
    "training/audit_recommendation_dataset.py",
    "training/register_existing_recommendation_model.py",
    "training/model_registry.py",
    "models_artifacts/recommendation/model_card.md",
]

BACKUP_DIR = BASE_DIR / "training" / "_backup_before_encoding_fix_v1"
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
    "â€™": "’",
    "â€”": "—",
    "nâ€™": "n’",
    "dâ€™": "d’",
    "lâ€™": "l’",
    "quâ€™": "qu’",
    "jusquâ€™": "jusqu’",
    "cÃ´tÃ©": "côté",
    "dÃ©jÃ": "déjà",
    "modÃ¨le": "modèle",
    "Ã©vÃ©nement": "événement",
    "Ã©vÃ©nements": "événements",
    "donnÃ©es": "données",
    "entraÃ®ner": "entraîner",
    "entraÃ®nÃ©": "entraîné",
    "MÃ©triques": "Métriques",
    "RÃ¨gle": "Règle",
    "TÃ¢che": "Tâche",
    "tÃ¢che": "tâche",
    "Ã©craser": "écraser",
    "Ã©viter": "éviter",
    "nÃ©cessaire": "nécessaire",
    "basÃ©e": "basée",
    "amÃ©lioration": "amélioration",
    "prÃ©sence": "présence",
    "intÃ©rÃªts": "intérêts",
    "rÃ©elles": "réelles",
    "rÃ©glement": "règlement",
}


def fix_file(relative_path: str) -> bool:
    path = BASE_DIR / relative_path

    if not path.exists():
        print(f"[SKIP] Fichier introuvable: {relative_path}")
        return False

    backup_path = BACKUP_DIR / relative_path.replace("/", "__")
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

    for file_path in FILES_TO_FIX:
        if fix_file(file_path):
            changed += 1

    print(f"\nCorrection terminée. Fichiers modifiés: {changed}")
    print(f"Backup: {BACKUP_DIR}")


if __name__ == "__main__":
    main()