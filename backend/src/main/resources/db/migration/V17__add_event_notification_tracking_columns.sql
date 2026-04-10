ALTER TABLE events
    ADD COLUMN reminder_24h_sent_at TIMESTAMPTZ,
ADD COLUMN deadline_reminder_48h_sent_at TIMESTAMPTZ,
ADD COLUMN feedback_notification_sent_at TIMESTAMPTZ;