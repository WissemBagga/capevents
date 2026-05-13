from pathlib import Path
from datetime import datetime, timezone


BASE_DIR = Path(__file__).resolve().parents[1]
REPORT_PATH = BASE_DIR / "reports" / "markdown_french_audit_v1.md"

IGNORED_PARTS = {
    ".git",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    "tmp",
    "catboost_info",
}

MOJIBAKE_MARKERS = [
    "Ã",
    "â€™",
    "â€”",
    "Â«",
    "Â»",
    "Â ",
]

ENGLISH_MARKERS = [
    "## Objective",
    "## Purpose",
    "## Model",
    "## Dataset",
    "## Metrics",
    "## Limitations",
    "## Future improvements",
    "## Decision",
    "## Status",
    "Model Card",
    "Training rows",
    "Validation rows",
    "production model",
    "candidate model",
]


def should_ignore(path: Path) -> bool:
    return any(part in IGNORED_PARTS for part in path.parts)


def detect_issues(path: Path) -> list[str]:
    issues = []

    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        return ["Impossible de lire le fichier en UTF-8"]

    for marker in MOJIBAKE_MARKERS:
        if marker in content:
            issues.append(f"Encodage cassé détecté : `{marker}`")

    for marker in ENGLISH_MARKERS:
        if marker in content:
            issues.append(f"Contenu anglais détecté : `{marker}`")

    if not content.strip():
        issues.append("Fichier vide")

    return issues


def main() -> None:
    md_files = sorted(
        path
        for path in BASE_DIR.rglob("*.md")
        if not should_ignore(path)
    )

    rows = []

    for path in md_files:
        relative_path = path.relative_to(BASE_DIR)
        issues = detect_issues(path)

        rows.append({
            "path": str(relative_path).replace("\\", "/"),
            "status": "OK" if not issues else "À corriger",
            "issues": issues,
        })

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with REPORT_PATH.open("w", encoding="utf-8") as file:
        file.write("# Audit Markdown français — CapEvents AI\n\n")
        file.write(f"Généré le : {datetime.now(timezone.utc).isoformat()}\n\n")

        file.write("## Résumé\n\n")
        file.write(f"- Fichiers Markdown analysés : {len(rows)}\n")
        file.write(f"- Fichiers OK : {sum(1 for row in rows if row['status'] == 'OK')}\n")
        file.write(f"- Fichiers à corriger : {sum(1 for row in rows if row['status'] != 'OK')}\n\n")

        file.write("## Détail\n\n")

        for row in rows:
            file.write(f"### `{row['path']}`\n\n")
            file.write(f"Statut : **{row['status']}**\n\n")

            if row["issues"]:
                for issue in row["issues"]:
                    file.write(f"- {issue}\n")
            else:
                file.write("- Aucun problème détecté.\n")

            file.write("\n")

    print(f"Audit terminé : {REPORT_PATH}")


if __name__ == "__main__":
    main()