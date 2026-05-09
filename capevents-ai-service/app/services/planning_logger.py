import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


LOG_DIR = Path("logs/planning")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")

    if hasattr(value, "dict"):
        return value.dict()

    return value


def append_planning_log(event_type: str, payload: dict[str, Any]) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    log_file = LOG_DIR / f"planning-{now.date().isoformat()}.jsonl"

    record = {
        "logged_at": now.isoformat(),
        "event_type": event_type,
        **payload
    }

    with log_file.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")