ALTER TABLE events
DROP CONSTRAINT IF EXISTS chk_event_status;

ALTER TABLE events
    ADD CONSTRAINT chk_event_status
        CHECK (status IN (
                          'DRAFT',
                          'PUBLISHED',
                          'PENDING',
                          'REJECTED',
                          'CANCELLED',
                          'ARCHIVED'
            ));