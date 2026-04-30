import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd


CAPEVENTS_CATEGORIES = [
    "Formation",
    "Team building",
    "Conférence",
    "Atelier",
    "Webinaire",
    "Afterwork",
    "Bien-être",
    "Sport",
    "RSE",
    "Networking",
    "Culture d’entreprise",
    "Innovation"
]


CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Formation": [
        "training", "formation", "course", "learning", "education",
        "skill", "skills", "certification"
    ],
    "Team building": [
        "team", "team building", "cohesion", "cohésion",
        "collaboration", "group", "collective"
    ],
    "Conférence": [
        "conference", "conférence", "seminar", "talk",
        "keynote", "summit", "panel"
    ],
    "Atelier": [
        "workshop", "atelier", "hands-on", "practical",
        "interactive session"
    ],
    "Webinaire": [
        "webinar", "webinaire", "online session", "remote talk",
        "virtual event"
    ],
    "Afterwork": [
        "afterwork", "after work", "social", "party",
        "soirée", "coffee", "café", "drink"
    ],
    "Bien-être": [
        "wellbeing", "well-being", "bien-être", "wellness",
        "health", "mental", "yoga", "relaxation", "stress"
    ],
    "Sport": [
        "sport", "football", "basketball", "running",
        "fitness", "tournament", "tournoi", "match"
    ],
    "RSE": [
        "csr", "rse", "volunteer", "volunteering",
        "charity", "solidarity", "environment", "environnement",
        "sustainability"
    ],
    "Networking": [
        "networking", "network", "meetup", "meet-up",
        "community", "communauté", "business meeting"
    ],
    "Culture d’entreprise": [
        "culture", "company culture", "corporate culture",
        "values", "onboarding", "employee experience"
    ],
    "Innovation": [
        "innovation", "hackathon", "ai", "ia", "tech",
        "digital", "startup", "prototype", "design thinking"
    ]
}


DAY_NAME_TO_INDEX = {
    "monday": 0,
    "mon": 0,
    "lundi": 0,
    "tuesday": 1,
    "tue": 1,
    "mardi": 1,
    "wednesday": 2,
    "wed": 2,
    "mercredi": 2,
    "thursday": 3,
    "thu": 3,
    "jeudi": 3,
    "friday": 4,
    "fri": 4,
    "vendredi": 4,
    "saturday": 5,
    "sat": 5,
    "samedi": 5,
    "sunday": 6,
    "sun": 6,
    "dimanche": 6
}


def clean_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""

    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def get_column_value(row: pd.Series, column_name: str | None, default: Any = None) -> Any:
    if not column_name:
        return default

    if column_name not in row.index:
        return default

    value = row[column_name]
    if pd.isna(value):
        return default

    return value


def map_category(topic: str, event_type: str = "") -> str:
    source = f"{topic} {event_type}".lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in source:
                return category

    return "Culture d’entreprise"


def parse_duration_minutes(value: Any, default_duration: int = 120) -> int:
    if value is None or pd.isna(value):
        return default_duration

    text = str(value).lower().strip()

    numbers = re.findall(r"\d+", text)
    if not numbers:
        return default_duration

    number = int(numbers[0])

    if "hour" in text or "heure" in text or "hr" in text:
        return number * 60

    return number


def estimate_capacity(previous_attendance: Any, default_capacity: int = 50) -> int:
    if previous_attendance is None or pd.isna(previous_attendance):
        return default_capacity

    try:
        attendance = int(float(previous_attendance))
        return max(20, int(attendance * 1.25))
    except Exception:
        return default_capacity


def next_date_for_day(day_name: str, start_hour: int = 17) -> datetime:
    today = datetime.now(timezone.utc)

    cleaned_day = clean_text(day_name).lower()
    target_index = DAY_NAME_TO_INDEX.get(cleaned_day)

    if target_index is None:
        # Date par défaut : dans 14 jours à 17h
        return (today + timedelta(days=14)).replace(
            hour=start_hour,
            minute=0,
            second=0,
            microsecond=0
        )

    days_ahead = (target_index - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7

    return (today + timedelta(days=days_ahead)).replace(
        hour=start_hour,
        minute=0,
        second=0,
        microsecond=0
    )


def build_description(title: str, topic: str, event_type: str, source: str) -> str:
    parts = [
        f"Événement importé depuis une source externe autorisée ({source})."
    ]

    if topic:
        parts.append(f"Thématique d'origine : {topic}.")

    if event_type:
        parts.append(f"Type d'événement d'origine : {event_type}.")

    parts.append(
        "Cet événement a été normalisé au format CapEvents pour enrichir le dataset IA."
    )

    return " ".join(parts)


def normalize_external_events(config_path: str) -> pd.DataFrame:
    with open(config_path, "r", encoding="utf-8") as file:
        config = json.load(file)

    input_file = Path(config["input_file"])
    output_file = Path(config["output_file"])
    data_source = config.get("data_source", "EXTERNAL")
    columns = config.get("columns", {})
    defaults = config.get("defaults", {})

    if not input_file.exists():
        raise FileNotFoundError(f"Fichier introuvable: {input_file}")

    raw_df = pd.read_csv(input_file)
    rows: list[dict] = []

    for index, row in raw_df.iterrows():
        title = clean_text(
            get_column_value(row, columns.get("title"), f"Événement externe {index + 1}")
        )

        location_name = clean_text(
            get_column_value(row, columns.get("location_name"), "Lieu à confirmer")
        )

        topic = clean_text(get_column_value(row, columns.get("topic"), ""))
        event_type = clean_text(get_column_value(row, columns.get("event_type"), ""))

        previous_attendance = get_column_value(
            row,
            columns.get("previous_attendance"),
            None
        )

        duration_minutes = parse_duration_minutes(
            get_column_value(row, columns.get("duration_minutes"), None),
            default_duration=int(defaults.get("duration_minutes", 120))
        )

        capacity = estimate_capacity(
            previous_attendance,
            default_capacity=int(defaults.get("capacity", 50))
        )

        day_of_week = clean_text(
            get_column_value(row, columns.get("day_of_week"), "")
        )

        start_at = next_date_for_day(day_of_week)
        registration_deadline = start_at - timedelta(days=3)

        category = map_category(topic=topic, event_type=event_type)

        rows.append({
            "external_id": f"{data_source}_{index + 1}",
            "data_source": data_source,
            "title": title,
            "category": category,
            "description": build_description(title, topic, event_type, data_source),
            "start_at": start_at.isoformat(),
            "duration_minutes": duration_minutes,
            "location_type": defaults.get("location_type", "ONSITE"),
            "location_name": location_name,
            "meeting_url": "",
            "address": location_name,
            "capacity": capacity,
            "registration_deadline": registration_deadline.isoformat(),
            "status": defaults.get("status", "PUBLISHED"),
            "audience": defaults.get("audience", "GLOBAL"),
            "target_department_id": "",
            "previous_attendance": previous_attendance if previous_attendance is not None else "",
            "topic_original": topic,
            "event_type_original": event_type
        })

    standardized_df = pd.DataFrame(rows)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    standardized_df.to_csv(output_file, index=False, encoding="utf-8")

    print(f"[OK] {len(standardized_df)} événements normalisés -> {output_file}")

    return standardized_df


def main() -> None:
    normalize_external_events("configs/external_event_mapping.example.json")


if __name__ == "__main__":
    main()