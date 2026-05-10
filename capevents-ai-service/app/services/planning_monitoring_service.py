import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


LOG_DIR = Path("logs/planning")


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def read_planning_logs(days: int) -> list[dict[str, Any]]:
    if not LOG_DIR.exists():
        return []

    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    items: list[dict[str, Any]] = []

    for path in LOG_DIR.glob("planning-*.jsonl"):
        with path.open("r", encoding="utf-8") as file:
            for line in file:
                line = line.strip()

                if not line:
                    continue

                try:
                    record = json.loads(line)
                except Exception:
                    continue

                logged_at = parse_datetime(record.get("logged_at"))

                if logged_at and logged_at >= start_date:
                    items.append(record)

    return items


def get_planning_monitoring_summary(
    days: int = 30,
    target_department_id: int | None = None
) -> dict[str, Any]:
    logs = read_planning_logs(days)

    if target_department_id is not None:
        logs = [
            item for item in logs
            if item.get("target_department_id") in [target_department_id, str(target_department_id)]
        ]

    generations = [
        item for item in logs
        if item.get("event_type") == "EVENT_PROPOSALS_GENERATED"
    ]

    usages = [
        item for item in logs
        if item.get("event_type") == "PROPOSAL_USAGE"
    ]

    copied = [
        item for item in usages
        if item.get("action") == "COPIED"
    ]

    used_to_prefill = [
        item for item in usages
        if item.get("action") == "USED_TO_PREFILL"
    ]

    categories = Counter(
        item.get("category")
        for item in usages
        if item.get("category")
    )

    proposal_titles = Counter(
        item.get("proposal_title")
        for item in usages
        if item.get("proposal_title")
    )

    model_versions = Counter()

    for item in generations:
        model_info = item.get("model_info") or {}
        version = model_info.get("version")

        if version:
            model_versions[version] += 1

    latest_events = sorted(
        logs,
        key=lambda item: item.get("logged_at", ""),
        reverse=True
    )[:10]

    total_generations = len(generations)
    total_used = len(used_to_prefill)

    usage_rate = 0.0
    if total_generations > 0:
        usage_rate = total_used / total_generations

    return {
        "period_days": days,
        "target_department_id": target_department_id,
        "total_generations": total_generations,
        "total_usage_events": len(usages),
        "copied_count": len(copied),
        "used_to_prefill_count": total_used,
        "usage_rate": round(usage_rate, 4),
        "top_categories": [
            {"category": category, "count": count}
            for category, count in categories.most_common(5)
        ],
        "top_proposals": [
            {"title": title, "count": count}
            for title, count in proposal_titles.most_common(5)
        ],
        "model_versions": [
            {"version": version, "count": count}
            for version, count in model_versions.most_common()
        ],
        "latest_events": latest_events
    }