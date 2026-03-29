ALTER TABLE event_registrations
ADD COLUMN attendance_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';