ALTER TABLE event_registrations
    ADD COLUMN cancel_reason VARCHAR(120);

ALTER TABLE event_registrations
    ADD COLUMN cancel_comment TEXT;