from typing import Any


MOJIBAKE_REPLACEMENTS = {
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
    "â€˜": "’",
    "â€œ": "“",
    "â€": "”",
    "â€”": "—",
    "Â«": "«",
    "Â»": "»",
    "Â ": " ",

    # Cas fréquents après génération LLM / logs
    "lâ": "l’",
    "dâ": "d’",
    "nâ": "n’",
    "quâ": "qu’",
    "Lâ": "L’",
    "Dâ": "D’",
    "Nâ": "N’",
    "Quâ": "Qu’",

    # Messages historiques
    "HR copilot suggestions generated successfully.": "Suggestions du Copilote RH générées avec succès.",
    "Recommendations generated successfully.": "Recommandations générées avec succès.",
}


def clean_text(value: Any) -> str:
    text = str(value or "").strip()

    if not text:
        return ""

    for _ in range(2):
        if any(marker in text for marker in ["Ã", "â", "Â"]):
            try:
                text = text.encode("latin1").decode("utf-8")
            except Exception:
                try:
                    text = text.encode("cp1252").decode("utf-8")
                except Exception:
                    break

    for old, new in MOJIBAKE_REPLACEMENTS.items():
        text = text.replace(old, new)

    return text.strip()


def sanitize_payload(value: Any) -> Any:
    if isinstance(value, str):
        return clean_text(value)

    if isinstance(value, list):
        return [sanitize_payload(item) for item in value]

    if isinstance(value, tuple):
        return tuple(sanitize_payload(item) for item in value)

    if isinstance(value, dict):
        return {
            key: sanitize_payload(item)
            for key, item in value.items()
        }

    return value