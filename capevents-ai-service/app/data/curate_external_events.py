import json
import random
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd


CATEGORY_MAPPING = {
    "Technology": "Innovation",
    "Education": "Formation",
    "Business": "Conférence",
    "Art": "Culture d’entreprise",
    "Music": "Culture d’entreprise",
    "Fun": "Team building",
    "Health": "Bien-être",
    "Sports": "Sport",
    "Sport": "Sport",
    "Innovation": "Innovation",
    "Environment": "RSE",
    "Community": "Networking"
}


TITLE_TEMPLATES = {
    "Formation": [
        "Session de formation {topic}",
        "Module d’apprentissage {topic}",
        "Formation pratique {topic}"
    ],
    "Conférence": [
        "Conférence interne {topic}",
        "Table ronde {topic}",
        "Keynote interne {topic}"
    ],
    "Atelier": [
        "Atelier collaboratif {topic}",
        "Workshop pratique {topic}",
        "Atelier d’échange {topic}"
    ],
    "Team building": [
        "Défi collaboratif {topic}",
        "Activité de cohésion {topic}",
        "Challenge équipe {topic}"
    ],
    "Culture d’entreprise": [
        "Rencontre culture interne {topic}",
        "Session valeurs et collaboration {topic}",
        "Moment culture d’entreprise {topic}"
    ],
    "Afterwork": [
        "Afterwork {topic}",
        "Moment convivial {topic}",
        "Rencontre informelle {topic}"
    ],
    "Networking": [
        "Forum d’échanges {topic}",
        "Speed meeting {topic}",
        "Rencontre networking {topic}"
    ],
    "Bien-être": [
        "Pause bien-être {topic}",
        "Atelier équilibre et santé {topic}",
        "Session bien-être {topic}"
    ],
    "RSE": [
        "Journée responsable {topic}",
        "Action solidaire {topic}",
        "Initiative RSE {topic}"
    ],
    "Innovation": [
        "Atelier innovation {topic}",
        "Hackathon interne {topic}",
        "Session innovation {topic}"
    ],
    "Sport": [
        "Challenge sportif {topic}",
        "Activité sportive {topic}",
        "Tournoi interne {topic}"
    ],
    "Webinaire": [
        "Webinaire interne {topic}",
        "Live interne {topic}",
        "Session en ligne {topic}"
    ],
    "Autre": [
        "Événement interne {topic}",
        "Rencontre interne {topic}"
    ]
}


TOPIC_TRANSLATIONS = {
    "Business": "business et stratégie",
    "Education": "apprentissage et partage",
    "Technology": "technologie et innovation",
    "Art": "culture et créativité",
    "Music": "culture et loisirs",
    "Fun": "cohésion et engagement",
    "Health": "bien-être au travail",
    "Sports": "activité physique",
    "Sport": "activité physique",
    "Innovation": "innovation interne",
    "Environment": "responsabilité environnementale",
    "Community": "communauté interne"
}


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def clean_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def clamp_int(value: Any, minimum: int, maximum: int, default: int) -> int:
    try:
        number = int(float(value))
    except Exception:
        return default

    if number < minimum:
        return minimum
    if number > maximum:
        return maximum
    return number


def map_category(topic_original: str, current_category: str) -> str:
    topic = clean_text(topic_original)

    if topic in CATEGORY_MAPPING:
        return CATEGORY_MAPPING[topic]

    current = clean_text(current_category)
    if current:
        return current

    return "Autre"


def build_title(category: str, topic_original: str, index: int) -> str:
    topic_fr = TOPIC_TRANSLATIONS.get(topic_original, topic_original.lower() or "engagement interne")
    templates = TITLE_TEMPLATES.get(category, TITLE_TEMPLATES["Autre"])
    template = templates[index % len(templates)]
    return f"{template.format(topic=topic_fr)} - édition EXT-{index + 1:04d}"


def build_description(category: str, topic_original: str, event_type_original: str) -> str:
    topic_fr = TOPIC_TRANSLATIONS.get(topic_original, topic_original.lower() or "engagement interne")

    return (
        f"{category} dédié à {topic_fr}, normalisé depuis une source externe autorisée "
        f"pour enrichir le dataset IA CapEvents. "
        f"Type d’origine : {event_type_original or 'non précisé'}. "
        f"Cette ligne est utilisée uniquement pour l’entraînement et l’augmentation de données."
    )


def random_datetime_between(start_date: str, end_date: str, index: int) -> datetime:
    start = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
    end = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)

    total_days = max((end - start).days, 1)
    day_offset = index % total_days

    possible_hours = [9, 10, 11, 13, 14, 15, 16, 17, 18]
    hour = possible_hours[index % len(possible_hours)]

    return (start + timedelta(days=day_offset)).replace(
        hour=hour,
        minute=0,
        second=0,
        microsecond=0
    )


def curate_external_events(config_path: str = "configs/external_event_cleaning_policy.json") -> pd.DataFrame:
    config = load_config(config_path)

    input_file = Path(config["input_file"])
    output_file = Path(config["output_file"])

    if not input_file.exists():
        raise FileNotFoundError(f"Fichier introuvable: {input_file}")

    df = pd.read_csv(input_file)

    print(f"[INFO] Lignes brutes: {len(df)}")

    allowed_topics = set(config.get("allowed_topics", []))
    blocked_topics = set(config.get("blocked_topics", []))
    blocked_event_types = set(config.get("blocked_event_types", []))
    allowed_categories = set(config.get("allowed_categories", []))

    df["topic_original"] = df["topic_original"].fillna("").astype(str)
    df["event_type_original"] = df["event_type_original"].fillna("").astype(str)

    # 1. Supprimer les topics bloqués
    df = df[~df["topic_original"].isin(blocked_topics)]

    # 2. Garder seulement les topics utiles si la liste existe
    if allowed_topics:
        df = df[df["topic_original"].isin(allowed_topics)]

    # 3. Supprimer les types d’événements non adaptés à CapEvents
    df = df[~df["event_type_original"].isin(blocked_event_types)]

    print(f"[INFO] Après filtre topic/type: {len(df)}")

    # 4. Remapper catégories
    df["category"] = df.apply(
        lambda row: map_category(row.get("topic_original"), row.get("category")),
        axis=1
    )

    df = df[df["category"].isin(allowed_categories)]

    print(f"[INFO] Après filtre catégories: {len(df)}")

    # 5. Réduire la taille
    max_rows = int(config.get("max_rows", 3000))
    random_state = int(config.get("random_state", 42))

    if len(df) > max_rows:
        df = df.sample(n=max_rows, random_state=random_state)

    df = df.reset_index(drop=True)

    capacity_rules = config["capacity"]
    duration_rules = config["duration_minutes"]
    location_names = config["location_names"]

    curated_rows = []

    for index, row in df.iterrows():
        category = clean_text(row.get("category"))
        topic_original = clean_text(row.get("topic_original"))
        event_type_original = clean_text(row.get("event_type_original"))

        capacity = clamp_int(
            row.get("capacity"),
            minimum=int(capacity_rules["min"]),
            maximum=int(capacity_rules["max"]),
            default=int(capacity_rules["default"])
        )

        duration_minutes = clamp_int(
            row.get("duration_minutes"),
            minimum=int(duration_rules["min"]),
            maximum=int(duration_rules["max"]),
            default=int(duration_rules["default"])
        )

        start_at = random_datetime_between(
            config["start_date"],
            config["end_date"],
            index
        )

        registration_deadline = start_at - timedelta(days=7)

        location_type = "ONLINE" if index % 5 == 0 else "ONSITE"
        location_name = "" if location_type == "ONLINE" else location_names[index % len(location_names)]
        meeting_url = f"https://meet.company.example/external-curated-{index + 1:04d}" if location_type == "ONLINE" else ""
        address = "" if location_type == "ONLINE" else location_name

        title = build_title(category, topic_original, index)

        curated_rows.append({
            "external_id": f"KAGGLE_CURATED_{index + 1:04d}",
            "data_source": "KAGGLE_CURATED",
            "title": title,
            "category": category,
            "description": build_description(category, topic_original, event_type_original),
            "start_at": start_at.isoformat(),
            "duration_minutes": duration_minutes,
            "location_type": location_type,
            "location_name": location_name,
            "meeting_url": meeting_url,
            "address": address,
            "capacity": capacity,
            "registration_deadline": registration_deadline.isoformat(),
            "status": "PUBLISHED",
            "audience": "GLOBAL",
            "target_department_id": "",
            "previous_attendance": row.get("previous_attendance", ""),
            "topic_original": topic_original,
            "event_type_original": event_type_original,
            "external_weight": 0.25
        })

    curated_df = pd.DataFrame(curated_rows)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    curated_df.to_csv(output_file, index=False, encoding="utf-8")

    print(f"[OK] Dataset externe nettoyé: {len(curated_df)} lignes -> {output_file}")

    return curated_df


def main() -> None:
    curate_external_events()


if __name__ == "__main__":
    main()