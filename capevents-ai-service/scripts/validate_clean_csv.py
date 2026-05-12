from pathlib import Path
import csv
import re
from datetime import datetime, timezone
from collections import defaultdict, Counter

BASE_DIR = Path(__file__).resolve().parents[1]

DATA_DIR = BASE_DIR / "datasets" / "clean" / "capevents_v1"
REPORT_DIR = BASE_DIR / "datasets" / "reports"

ERRORS_CSV = REPORT_DIR / "data_quality_errors_v1.csv"
REPORT_MD = REPORT_DIR / "data_quality_report_v1.md"

REQUIRED_FILES = [
    "departments.csv",
    "users.csv",
    "events.csv",
    "event_registrations.csv",
    "event_invitations.csv",
    "event_invitation_reminders.csv",
    "event_feedbacks.csv",
    "interests.csv",
    "user_interests.csv",
    "points_transactions.csv",
    "user_badges.csv",
]

VALID_EVENT_STATUS = {"DRAFT", "PUBLISHED", "PENDING", "REJECTED", "CANCELLED", "ARCHIVED"}
VALID_AUDIENCE = {"GLOBAL", "DEPARTMENT", "INDIVIDUAL"}
VALID_LOCATION_TYPE = {"ONLINE", "ONSITE", "EXTERNAL"}
VALID_REGISTRATION_STATUS = {"REGISTERED", "CANCELLED"}
VALID_ATTENDANCE_STATUS = {"PENDING", "PRESENT", "ABSENT"}
VALID_INVITATION_STATUS = {"PENDING", "RESPONDED", "EXPIRED"}
VALID_INVITATION_TARGET = {"GLOBAL", "DEPARTMENT", "INDIVIDUAL"}
VALID_RSVP = {"YES", "MAYBE", "NO"}
VALID_REMINDER_STATUS = {"SENT", "FAILED", "PENDING"}

PHONE_RE = re.compile(r"^\+216\d{8}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


errors = []


def add_error(table, row, severity, code, message, key=""):
    errors.append({
        "table": table,
        "row": row,
        "severity": severity,
        "code": code,
        "message": message,
        "key": key,
    })


def clean_value(value):
    if value is None:
        return ""
    return str(value).strip()


def is_blank(value):
    return clean_value(value) == "" or clean_value(value).lower() in {"null", "none", "nan"}


def parse_int(value):
    try:
        if is_blank(value):
            return None
        return int(float(clean_value(value)))
    except Exception:
        return None


def parse_datetime(value):
    if is_blank(value):
        return None

    raw = clean_value(value)

    # Support formats like:
    # 2026-04-30 09:33:49.821847+00:00
    # 2026-04-30 09:33:49+00
    # 2026-04-30T09:33:49+00:00
    raw = raw.replace("Z", "+00:00")

    try:
        return datetime.fromisoformat(raw)
    except Exception:
        pass

    try:
        if raw.endswith("+00"):
            raw = raw[:-3] + "+00:00"
        return datetime.fromisoformat(raw)
    except Exception:
        return None


def sniff_delimiter(file_path):
    sample = file_path.read_text(encoding="utf-8-sig", errors="ignore")[:4096]
    try:
        return csv.Sniffer().sniff(sample).delimiter
    except Exception:
        return ","


def read_csv(file_name):
    path = DATA_DIR / file_name
    table = file_name.replace(".csv", "")

    if not path.exists():
        add_error(table, 0, "ERROR", "MISSING_FILE", f"Fichier manquant: {file_name}")
        return []

    delimiter = sniff_delimiter(path)

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        rows = []
        for i, row in enumerate(reader, start=2):
            normalized = {clean_value(k): clean_value(v) for k, v in row.items() if k is not None}
            normalized["_row_number"] = i
            rows.append(normalized)

    return rows


def require_columns(table_name, rows, required_columns):
    if not rows:
        return False

    existing = set(rows[0].keys())
    missing = [col for col in required_columns if col not in existing]

    for col in missing:
        add_error(table_name, 1, "ERROR", "MISSING_COLUMN", f"Colonne manquante: {col}")

    return len(missing) == 0


def build_index(rows, key, table):
    index = {}
    for row in rows:
        value = clean_value(row.get(key))
        row_num = row["_row_number"]

        if is_blank(value):
            add_error(table, row_num, "ERROR", "MISSING_ID", f"Identifiant manquant: {key}")
            continue

        if value in index:
            add_error(table, row_num, "ERROR", "DUPLICATE_ID", f"Identifiant dupliqué: {value}", value)
        else:
            index[value] = row

    return index


def main():
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    print("Validation CapEvents CSV - mode non destructif")
    print(f"Lecture depuis: {DATA_DIR}")

    all_rows = {}

    for file_name in REQUIRED_FILES:
        all_rows[file_name] = read_csv(file_name)

    departments = all_rows["departments.csv"]
    users = all_rows["users.csv"]
    events = all_rows["events.csv"]
    registrations = all_rows["event_registrations.csv"]
    invitations = all_rows["event_invitations.csv"]
    reminders = all_rows["event_invitation_reminders.csv"]
    feedbacks = all_rows["event_feedbacks.csv"]
    interests = all_rows["interests.csv"]
    user_interests = all_rows["user_interests.csv"]
    points = all_rows["points_transactions.csv"]
    badges = all_rows["user_badges.csv"]

    require_columns("departments", departments, ["id", "name"])
    require_columns("users", users, ["id", "first_name", "last_name", "email", "department_id", "is_active", "email_verified"])
    require_columns("events", events, [
        "id", "title", "category", "start_at", "duration_minutes", "location_type",
        "capacity", "registration_deadline", "status", "audience", "target_department_id", "created_by"
    ])
    require_columns("event_registrations", registrations, [
        "id", "event_id", "user_id", "status", "registered_at", "cancelled_at", "attendance_status"
    ])
    require_columns("event_invitations", invitations, [
        "id", "event_id", "user_id", "invited_by", "target_type", "status", "sent_at", "rsvp_response"
    ])
    require_columns("event_invitation_reminders", reminders, [
        "id", "invitation_id", "sent_by", "channel", "status", "sent_at"
    ])
    require_columns("event_feedbacks", feedbacks, [
        "id", "event_id", "user_id", "rating", "comment", "share_comment_publicly", "created_at"
    ])
    require_columns("interests", interests, ["id", "code", "label_fr"])
    require_columns("user_interests", user_interests, ["user_id", "interest_id"])
    require_columns("points_transactions", points, ["id", "user_id", "event_id", "type", "points_delta", "created_at"])
    require_columns("user_badges", badges, ["id", "user_id", "badge_code", "unlocked_at"])

    dept_by_id = build_index(departments, "id", "departments")
    user_by_id = build_index(users, "id", "users")
    event_by_id = build_index(events, "id", "events")
    interest_by_id = build_index(interests, "id", "interests")
    invitation_by_id = build_index(invitations, "id", "event_invitations")

    # Users
    for row in users:
        row_num = row["_row_number"]
        user_id = row.get("id", "")

        email = row.get("email", "")
        if is_blank(email) or not EMAIL_RE.match(email):
            add_error("users", row_num, "ERROR", "INVALID_EMAIL", f"Email invalide: {email}", user_id)

        phone = row.get("phone", "")
        if not is_blank(phone):
            normalized_phone = phone.replace(" ", "")
            if not PHONE_RE.match(normalized_phone):
                add_error("users", row_num, "WARNING", "INVALID_PHONE", f"Téléphone non standard: {phone}", user_id)

        department_id = row.get("department_id", "")
        if is_blank(department_id):
            add_error("users", row_num, "WARNING", "MISSING_DEPARTMENT", "Utilisateur sans département", user_id)
        elif str(parse_int(department_id)) not in dept_by_id:
            add_error("users", row_num, "ERROR", "UNKNOWN_DEPARTMENT", f"Département inexistant: {department_id}", user_id)

        if is_blank(row.get("job_title", "")):
            add_error("users", row_num, "WARNING", "MISSING_JOB_TITLE", "Poste manquant", user_id)

    # Events
    for row in events:
        row_num = row["_row_number"]
        event_id = row.get("id", "")

        status = row.get("status", "")
        if status not in VALID_EVENT_STATUS:
            add_error("events", row_num, "ERROR", "INVALID_STATUS", f"Statut événement invalide: {status}", event_id)

        audience = row.get("audience", "")
        if audience not in VALID_AUDIENCE:
            add_error("events", row_num, "ERROR", "INVALID_AUDIENCE", f"Audience invalide: {audience}", event_id)

        location_type = row.get("location_type", "")
        if location_type not in VALID_LOCATION_TYPE:
            add_error("events", row_num, "ERROR", "INVALID_LOCATION_TYPE", f"Type de lieu invalide: {location_type}", event_id)

        capacity = parse_int(row.get("capacity", ""))
        if capacity is None or capacity <= 0:
            add_error("events", row_num, "ERROR", "INVALID_CAPACITY", f"Capacité invalide: {row.get('capacity')}", event_id)

        duration = parse_int(row.get("duration_minutes", ""))
        if duration is None or duration <= 0:
            add_error("events", row_num, "ERROR", "INVALID_DURATION", f"Durée invalide: {row.get('duration_minutes')}", event_id)

        start_at = parse_datetime(row.get("start_at", ""))
        deadline = parse_datetime(row.get("registration_deadline", ""))

        if start_at is None:
            add_error("events", row_num, "ERROR", "INVALID_START_AT", "Date start_at invalide", event_id)

        if deadline is None:
            add_error("events", row_num, "ERROR", "INVALID_DEADLINE", "Date registration_deadline invalide", event_id)

        if start_at and deadline and deadline >= start_at:
            add_error("events", row_num, "ERROR", "DEADLINE_AFTER_START", "registration_deadline doit être avant start_at", event_id)

        created_by = row.get("created_by", "")
        if created_by not in user_by_id:
            add_error("events", row_num, "ERROR", "UNKNOWN_CREATED_BY", f"Créateur inexistant: {created_by}", event_id)

        target_department_id = row.get("target_department_id", "")
        if audience == "GLOBAL" and not is_blank(target_department_id):
            add_error("events", row_num, "WARNING", "GLOBAL_WITH_TARGET_DEPARTMENT", "GLOBAL ne doit pas avoir target_department_id", event_id)

        if audience == "DEPARTMENT":
            if is_blank(target_department_id):
                add_error("events", row_num, "ERROR", "DEPARTMENT_WITHOUT_TARGET", "DEPARTMENT doit avoir target_department_id", event_id)
            elif str(parse_int(target_department_id)) not in dept_by_id:
                add_error("events", row_num, "ERROR", "UNKNOWN_TARGET_DEPARTMENT", f"Département cible inexistant: {target_department_id}", event_id)

        if location_type == "ONLINE" and is_blank(row.get("meeting_url", "")):
            add_error("events", row_num, "ERROR", "ONLINE_WITHOUT_MEETING_URL", "ONLINE doit avoir meeting_url", event_id)

        if location_type == "ONSITE" and is_blank(row.get("location_name", "")):
            add_error("events", row_num, "ERROR", "ONSITE_WITHOUT_LOCATION_NAME", "ONSITE doit avoir location_name", event_id)

        if location_type == "EXTERNAL" and is_blank(row.get("address", "")):
            add_error("events", row_num, "ERROR", "EXTERNAL_WITHOUT_ADDRESS", "EXTERNAL doit avoir address", event_id)

    # Registrations
    active_registration_pairs = set()
    active_count_by_event = Counter()
    present_registration_pairs = set()

    for row in registrations:
        row_num = row["_row_number"]
        registration_id = row.get("id", "")
        event_id = row.get("event_id", "")
        user_id = row.get("user_id", "")

        if event_id not in event_by_id:
            add_error("event_registrations", row_num, "ERROR", "UNKNOWN_EVENT", f"event_id inexistant: {event_id}", registration_id)
            continue

        if user_id not in user_by_id:
            add_error("event_registrations", row_num, "ERROR", "UNKNOWN_USER", f"user_id inexistant: {user_id}", registration_id)
            continue

        status = row.get("status", "")
        attendance = row.get("attendance_status", "")

        if status not in VALID_REGISTRATION_STATUS:
            add_error("event_registrations", row_num, "ERROR", "INVALID_STATUS", f"Statut inscription invalide: {status}", registration_id)

        if attendance not in VALID_ATTENDANCE_STATUS:
            add_error("event_registrations", row_num, "ERROR", "INVALID_ATTENDANCE", f"Attendance invalide: {attendance}", registration_id)

        registered_at = parse_datetime(row.get("registered_at", ""))
        cancelled_at = parse_datetime(row.get("cancelled_at", ""))

        if registered_at is None:
            add_error("event_registrations", row_num, "ERROR", "INVALID_REGISTERED_AT", "registered_at invalide", registration_id)

        if status == "CANCELLED" and cancelled_at is None:
            add_error("event_registrations", row_num, "WARNING", "CANCELLED_WITHOUT_DATE", "Inscription CANCELLED sans cancelled_at", registration_id)

        event = event_by_id[event_id]
        deadline = parse_datetime(event.get("registration_deadline", ""))

        if registered_at and deadline and registered_at > deadline:
            add_error("event_registrations", row_num, "ERROR", "REGISTERED_AFTER_DEADLINE", "Inscription après deadline", registration_id)

        if status == "REGISTERED":
            pair = (event_id, user_id)
            if pair in active_registration_pairs:
                add_error("event_registrations", row_num, "ERROR", "DUPLICATE_ACTIVE_REGISTRATION", "Doublon inscription active event/user", registration_id)
            active_registration_pairs.add(pair)
            active_count_by_event[event_id] += 1

        if status == "REGISTERED" and attendance == "PRESENT":
            present_registration_pairs.add((event_id, user_id))

    for event_id, count in active_count_by_event.items():
        event = event_by_id.get(event_id)
        if not event:
            continue

        capacity = parse_int(event.get("capacity", ""))
        if capacity is not None and count > capacity:
            add_error("event_registrations", 0, "ERROR", "CAPACITY_EXCEEDED", f"Capacité dépassée: {count}/{capacity}", event_id)

    # Invitations
    invitation_pairs = set()

    for row in invitations:
        row_num = row["_row_number"]
        invitation_id = row.get("id", "")
        event_id = row.get("event_id", "")
        user_id = row.get("user_id", "")
        invited_by = row.get("invited_by", "")

        if event_id not in event_by_id:
            add_error("event_invitations", row_num, "ERROR", "UNKNOWN_EVENT", f"event_id inexistant: {event_id}", invitation_id)

        if user_id not in user_by_id:
            add_error("event_invitations", row_num, "ERROR", "UNKNOWN_USER", f"user_id inexistant: {user_id}", invitation_id)

        if invited_by not in user_by_id:
            add_error("event_invitations", row_num, "ERROR", "UNKNOWN_INVITER", f"invited_by inexistant: {invited_by}", invitation_id)

        if user_id == invited_by:
            add_error("event_invitations", row_num, "ERROR", "SELF_INVITATION", "Auto-invitation interdite", invitation_id)

        pair = (event_id, user_id)
        if pair in invitation_pairs:
            add_error("event_invitations", row_num, "WARNING", "DUPLICATE_INVITATION", "Invitation dupliquée event/user", invitation_id)
        invitation_pairs.add(pair)

        target_type = row.get("target_type", "")
        if target_type not in VALID_INVITATION_TARGET:
            add_error("event_invitations", row_num, "ERROR", "INVALID_TARGET_TYPE", f"target_type invalide: {target_type}", invitation_id)

        status = row.get("status", "")
        rsvp = row.get("rsvp_response", "")

        if status not in VALID_INVITATION_STATUS:
            add_error("event_invitations", row_num, "ERROR", "INVALID_STATUS", f"Statut invitation invalide: {status}", invitation_id)

        if status == "RESPONDED" and rsvp not in VALID_RSVP:
            add_error("event_invitations", row_num, "ERROR", "RESPONDED_WITHOUT_VALID_RSVP", f"RSVP invalide: {rsvp}", invitation_id)

        if status == "PENDING" and not is_blank(rsvp):
            add_error("event_invitations", row_num, "WARNING", "PENDING_WITH_RSVP", "Invitation PENDING avec RSVP rempli", invitation_id)

    # Reminders
    for row in reminders:
        row_num = row["_row_number"]
        reminder_id = row.get("id", "")
        invitation_id = row.get("invitation_id", "")
        sent_by = row.get("sent_by", "")

        if invitation_id not in invitation_by_id:
            add_error("event_invitation_reminders", row_num, "ERROR", "UNKNOWN_INVITATION", f"invitation_id inexistant: {invitation_id}", reminder_id)

        if sent_by not in user_by_id:
            add_error("event_invitation_reminders", row_num, "ERROR", "UNKNOWN_SENT_BY", f"sent_by inexistant: {sent_by}", reminder_id)

        status = row.get("status", "")
        if status not in VALID_REMINDER_STATUS:
            add_error("event_invitation_reminders", row_num, "WARNING", "INVALID_REMINDER_STATUS", f"Statut rappel inconnu: {status}", reminder_id)

    # Feedbacks
    feedback_pairs = set()

    for row in feedbacks:
        row_num = row["_row_number"]
        feedback_id = row.get("id", "")
        event_id = row.get("event_id", "")
        user_id = row.get("user_id", "")

        if event_id not in event_by_id:
            add_error("event_feedbacks", row_num, "ERROR", "UNKNOWN_EVENT", f"event_id inexistant: {event_id}", feedback_id)

        if user_id not in user_by_id:
            add_error("event_feedbacks", row_num, "ERROR", "UNKNOWN_USER", f"user_id inexistant: {user_id}", feedback_id)

        rating = parse_int(row.get("rating", ""))
        if rating is None or rating < 1 or rating > 5:
            add_error("event_feedbacks", row_num, "ERROR", "INVALID_RATING", f"rating invalide: {row.get('rating')}", feedback_id)

        pair = (event_id, user_id)
        if pair in feedback_pairs:
            add_error("event_feedbacks", row_num, "ERROR", "DUPLICATE_FEEDBACK", "Feedback dupliqué event/user", feedback_id)
        feedback_pairs.add(pair)

        if event_id in event_by_id and user_id in user_by_id and pair not in present_registration_pairs:
            add_error("event_feedbacks", row_num, "WARNING", "FEEDBACK_WITHOUT_PRESENT_REGISTRATION", "Feedback sans inscription PRESENT trouvée", feedback_id)

        if is_blank(row.get("comment", "")):
            add_error("event_feedbacks", row_num, "WARNING", "EMPTY_COMMENT", "Commentaire vide", feedback_id)

    # User interests
    interests_by_user = defaultdict(set)

    for row in user_interests:
        row_num = row["_row_number"]
        user_id = row.get("user_id", "")
        interest_id = row.get("interest_id", "")

        if user_id not in user_by_id:
            add_error("user_interests", row_num, "ERROR", "UNKNOWN_USER", f"user_id inexistant: {user_id}", user_id)

        if interest_id not in interest_by_id:
            add_error("user_interests", row_num, "ERROR", "UNKNOWN_INTEREST", f"interest_id inexistant: {interest_id}", user_id)

        if interest_id in interests_by_user[user_id]:
            add_error("user_interests", row_num, "WARNING", "DUPLICATE_USER_INTEREST", "Intérêt dupliqué pour utilisateur", user_id)

        interests_by_user[user_id].add(interest_id)

    for user_id, interest_ids in interests_by_user.items():
        if len(interest_ids) > 6:
            add_error("user_interests", 0, "WARNING", "TOO_MANY_INTERESTS", f"Utilisateur avec plus de 6 intérêts: {len(interest_ids)}", user_id)

    # Points
    for row in points:
        row_num = row["_row_number"]
        point_id = row.get("id", "")
        user_id = row.get("user_id", "")
        event_id = row.get("event_id", "")

        if user_id not in user_by_id:
            add_error("points_transactions", row_num, "ERROR", "UNKNOWN_USER", f"user_id inexistant: {user_id}", point_id)

        if not is_blank(event_id) and event_id not in event_by_id:
            add_error("points_transactions", row_num, "ERROR", "UNKNOWN_EVENT", f"event_id inexistant: {event_id}", point_id)

        delta = parse_int(row.get("points_delta", ""))
        if delta is None:
            add_error("points_transactions", row_num, "ERROR", "INVALID_POINTS_DELTA", f"points_delta invalide: {row.get('points_delta')}", point_id)

    # Badges
    badge_pairs = set()

    for row in badges:
        row_num = row["_row_number"]
        badge_id = row.get("id", "")
        user_id = row.get("user_id", "")
        badge_code = row.get("badge_code", "")

        if user_id not in user_by_id:
            add_error("user_badges", row_num, "ERROR", "UNKNOWN_USER", f"user_id inexistant: {user_id}", badge_id)

        if is_blank(badge_code):
            add_error("user_badges", row_num, "ERROR", "EMPTY_BADGE_CODE", "badge_code vide", badge_id)

        pair = (user_id, badge_code)
        if pair in badge_pairs:
            add_error("user_badges", row_num, "WARNING", "DUPLICATE_BADGE", "Badge dupliqué pour utilisateur", badge_id)

        badge_pairs.add(pair)

    write_reports(all_rows)

    error_count = sum(1 for e in errors if e["severity"] == "ERROR")
    warning_count = sum(1 for e in errors if e["severity"] == "WARNING")

    print(f"Terminé.")
    print(f"Erreurs: {error_count}")
    print(f"Warnings: {warning_count}")
    print(f"Rapport: {REPORT_MD}")
    print(f"Détails: {ERRORS_CSV}")


def write_reports(all_rows):
    with ERRORS_CSV.open("w", encoding="utf-8", newline="") as f:
        fieldnames = ["table", "row", "severity", "code", "message", "key"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(errors)

    by_table = Counter(e["table"] for e in errors)
    by_severity = Counter(e["severity"] for e in errors)

    with REPORT_MD.open("w", encoding="utf-8") as f:
        f.write("# CapEvents - Data Quality Report v1\n\n")
        f.write("Mode: non destructif. Aucun CSV n'a été modifié.\n\n")

        f.write("## Fichiers analysés\n\n")
        for file_name, rows in all_rows.items():
            f.write(f"- `{file_name}` : {len(rows)} lignes\n")

        f.write("\n## Résumé\n\n")
        f.write(f"- Erreurs bloquantes : {by_severity.get('ERROR', 0)}\n")
        f.write(f"- Warnings : {by_severity.get('WARNING', 0)}\n")
        f.write(f"- Total anomalies : {len(errors)}\n\n")

        f.write("## Anomalies par table\n\n")
        if not by_table:
            f.write("Aucune anomalie détectée.\n")
        else:
            for table, count in by_table.most_common():
                f.write(f"- `{table}` : {count}\n")

        f.write("\n## Prochaine étape\n\n")
        if by_severity.get("ERROR", 0) > 0:
            f.write("Corriger d'abord les erreurs bloquantes avant de générer les datasets IA.\n")
        else:
            f.write("Aucune erreur bloquante. La version clean peut passer à l'étape suivante.\n")


if __name__ == "__main__":
    main()