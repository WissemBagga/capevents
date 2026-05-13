import ast
from pathlib import Path
from datetime import datetime, timezone


BASE_DIR = Path(__file__).resolve().parents[1]
REPORT_PATH = BASE_DIR / "reports" / "ai_cleanup_candidates_v1.md"

IGNORED_PARTS = {
    ".git",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    "tmp",
    "catboost_info",
    "logs",
}

PYTHON_SCAN_DIRS = [
    "app",
    "scripts",
    "training",
]

ALWAYS_KEEP_MODULES = {
    "app.main",
    "app.core.config",
    "app.core.security",
    "app.core.model_registry",
    "app.core.text_sanitizer",
}

SCRIPT_KEEP_PATTERNS = {
    "validate_clean_csv.py",
    "audit_markdown_french_v1.py",
    "build_clean_manifest_v1.py",
    "compare_recommendation_versions.py",
    "validate_ia4_planning.py",
}

TRAINING_KEEP_PATTERNS = {
    "build_recommendation_dataset.py",
    "train_recommendation_model.py",
    "audit_recommendation_dataset.py",
    "build_planning_dataset.py",
    "train_planning_regressor.py",
    "evaluate_planning_regressor.py",
    "audit_planning_dataset.py",
    "model_registry.py",
    "promote_model.py",
    "register_existing_recommendation_model.py",
}

TEMPORARY_PATHS = [
    "catboost_info",
    "logs",
    "tmp",
    "app/services/_backup_before_recommendation_fix_v1",
    "datasets/clean/_backup_before_fix_remaining_warnings_v1",
    "datasets/clean/_backup_before_fix_self_invitations",
    "datasets/clean/_backup_before_fix_warnings_v1",
]

PUNCTUAL_SCRIPT_PREFIXES = [
    "fix_",
]


def should_ignore(path: Path) -> bool:
    return any(part in IGNORED_PARTS for part in path.parts)


def to_module_name(path: Path) -> str:
    relative = path.relative_to(BASE_DIR).with_suffix("")
    return ".".join(relative.parts)


def list_python_files() -> list[Path]:
    files = []

    for folder in PYTHON_SCAN_DIRS:
        root = BASE_DIR / folder

        if not root.exists():
            continue

        for path in root.rglob("*.py"):
            if should_ignore(path):
                continue

            files.append(path)

    return sorted(files)


def parse_file(path: Path) -> ast.AST | None:
    try:
        return ast.parse(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def collect_imports(tree: ast.AST) -> set[str]:
    imports = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name)

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module)

                for alias in node.names:
                    imports.add(f"{node.module}.{alias.name}")

    return imports


def collect_name_usage(tree: ast.AST) -> set[str]:
    names = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            names.add(node.id)

        elif isinstance(node, ast.Attribute):
            names.add(node.attr)

    return names


def collect_definitions(path: Path, tree: ast.AST) -> list[dict]:
    definitions = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            definitions.append({
                "file": path,
                "name": node.name,
                "line": node.lineno,
                "type": type(node).__name__,
            })

    return definitions


def classify_script(path: Path) -> str:
    name = path.name

    if name in SCRIPT_KEEP_PATTERNS:
        return "à garder"

    if any(name.startswith(prefix) for prefix in PUNCTUAL_SCRIPT_PREFIXES):
        return "à supprimer après validation"

    return "à vérifier"


def classify_training_file(path: Path) -> str:
    name = path.name

    if name in TRAINING_KEEP_PATTERNS:
        return "à garder"

    if name == "augment_recommendation_hard_negatives.py":
        return "à garder seulement si on conserve l'expérience v1.5.0"

    return "à vérifier"


def main() -> None:
    python_files = list_python_files()

    module_by_file = {
        path: to_module_name(path)
        for path in python_files
    }

    parsed = {
        path: parse_file(path)
        for path in python_files
    }

    parsed = {
        path: tree
        for path, tree in parsed.items()
        if tree is not None
    }

    all_imports = set()
    all_names = set()
    all_definitions = []

    for path, tree in parsed.items():
        all_imports.update(collect_imports(tree))
        all_names.update(collect_name_usage(tree))
        all_definitions.extend(collect_definitions(path, tree))

    potentially_unimported_app_modules = []

    for path, module in module_by_file.items():
        relative = str(path.relative_to(BASE_DIR)).replace("\\", "/")

        if not relative.startswith("app/"):
            continue

        if path.name == "__init__.py":
            continue

        if module in ALWAYS_KEEP_MODULES:
            continue

        imported = any(
            module == imported_module or imported_module.startswith(module + ".")
            for imported_module in all_imports
        )

        if not imported:
            potentially_unimported_app_modules.append(relative)

    potentially_unused_definitions = []

    for definition in all_definitions:
        path = definition["file"]
        relative = str(path.relative_to(BASE_DIR)).replace("\\", "/")
        name = definition["name"]

        if relative.startswith("app/api/"):
            continue

        if relative.startswith("app/schemas/"):
            continue

        if name.startswith("__"):
            continue

        if name in {
            "main",
            "get_suggestions",
            "recommend_for_user",
            "get_status",
            "clean_text",
            "sanitize_payload",
        }:
            continue

        if name not in all_names:
            continue

        # Si le nom apparaît uniquement dans sa définition, c'est un candidat.
        count = sum(
            1
            for path2, tree2 in parsed.items()
            for node in ast.walk(tree2)
            if (
                isinstance(node, ast.Name) and node.id == name
            ) or (
                isinstance(node, ast.Attribute) and node.attr == name
            )
        )

        if count <= 1:
            potentially_unused_definitions.append({
                "file": relative,
                "name": name,
                "line": definition["line"],
                "type": definition["type"],
            })

    temporary_existing = [
        item
        for item in TEMPORARY_PATHS
        if (BASE_DIR / item).exists()
    ]

    scripts_report = []
    scripts_dir = BASE_DIR / "scripts"

    if scripts_dir.exists():
        for path in sorted(scripts_dir.glob("*.py")):
            scripts_report.append({
                "file": str(path.relative_to(BASE_DIR)).replace("\\", "/"),
                "decision": classify_script(path),
            })

    training_report = []
    training_dir = BASE_DIR / "training"

    if training_dir.exists():
        for path in sorted(training_dir.glob("*.py")):
            training_report.append({
                "file": str(path.relative_to(BASE_DIR)).replace("\\", "/"),
                "decision": classify_training_file(path),
            })

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with REPORT_PATH.open("w", encoding="utf-8") as file:
        file.write("# Audit de nettoyage global IA — CapEvents AI\n\n")
        file.write(f"Généré le : {datetime.now(timezone.utc).isoformat()}\n\n")

        file.write("## Règle importante\n\n")
        file.write(
            "Ce rapport est non destructif. Aucun fichier n'est supprimé automatiquement.\n\n"
        )

        file.write("## Dossiers temporaires détectés\n\n")

        if temporary_existing:
            for item in temporary_existing:
                file.write(f"- `{item}` : à supprimer ou ignorer dans Git\n")
        else:
            file.write("- Aucun dossier temporaire détecté.\n")

        file.write("\n## Scripts `scripts/`\n\n")
        file.write("| Fichier | Décision |\n")
        file.write("|---|---|\n")

        for row in scripts_report:
            file.write(f"| `{row['file']}` | {row['decision']} |\n")

        file.write("\n## Scripts `training/`\n\n")
        file.write("| Fichier | Décision |\n")
        file.write("|---|---|\n")

        for row in training_report:
            file.write(f"| `{row['file']}` | {row['decision']} |\n")

        file.write("\n## Modules `app/` potentiellement non importés\n\n")

        if potentially_unimported_app_modules:
            for item in potentially_unimported_app_modules:
                file.write(f"- `{item}`\n")
        else:
            file.write("- Aucun module applicatif non importé détecté.\n")

        file.write("\n## Fonctions ou classes potentiellement inutilisées\n\n")

        if potentially_unused_definitions:
            for item in potentially_unused_definitions:
                file.write(
                    f"- `{item['file']}` ligne {item['line']} : "
                    f"`{item['name']}` ({item['type']})\n"
                )
        else:
            file.write("- Aucun candidat évident détecté.\n")

        file.write("\n## Recommandations générales\n\n")
        file.write("- Ne pas supprimer les fichiers dans `app/api/`, `app/services/` et `app/schemas/` sans test endpoint.\n")
        file.write("- Ne pas supprimer une version de modèle référencée dans `models_artifacts/model_registry.json` sans mettre à jour le registry.\n")
        file.write("- Les scripts `fix_*` sont généralement ponctuels et peuvent être supprimés après validation.\n")
        file.write("- Les logs et backups temporaires doivent être ignorés par Git.\n")
        file.write("- Les scripts d'entraînement et d'audit doivent rester pour la reproductibilité du PFE.\n")

    print(f"Audit terminé : {REPORT_PATH}")


if __name__ == "__main__":
    main()