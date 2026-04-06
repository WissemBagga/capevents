ALTER TABLE events
    ADD COLUMN reviewed_by UUID,
ADD COLUMN reviewed_at TIMESTAMPTZ,
ADD COLUMN review_comment VARCHAR(1000);

ALTER TABLE events
    ADD CONSTRAINT fk_events_reviewed_by
        FOREIGN KEY (reviewed_by) REFERENCES users(id);

CREATE INDEX idx_events_status_target_department
    ON events(status, target_department_id);