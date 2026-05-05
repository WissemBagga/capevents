ALTER TABLE event_invitations
DROP COLUMN IF EXISTS reminder_count;

ALTER TABLE event_invitations
DROP COLUMN IF EXISTS last_reminder_sent_at;

CREATE TABLE event_invitation_reminders (
                                            id BIGSERIAL PRIMARY KEY,

                                            invitation_id BIGINT NOT NULL REFERENCES event_invitations(id) ON DELETE CASCADE,

                                            sent_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

                                            channel VARCHAR(30) NOT NULL DEFAULT 'EMAIL',

                                            subject VARCHAR(255),

                                            message VARCHAR(2000),

                                            status VARCHAR(20) NOT NULL DEFAULT 'SENT',

                                            error_message VARCHAR(1000),

                                            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                                            CONSTRAINT chk_invitation_reminder_channel
                                                CHECK (channel IN ('EMAIL', 'SYSTEM')),

                                            CONSTRAINT chk_invitation_reminder_status
                                                CHECK (status IN ('SENT', 'FAILED'))
);

CREATE INDEX idx_invitation_reminders_invitation_id
    ON event_invitation_reminders(invitation_id);

CREATE INDEX idx_invitation_reminders_sent_by
    ON event_invitation_reminders(sent_by);

CREATE INDEX idx_invitation_reminders_sent_at
    ON event_invitation_reminders(sent_at);

CREATE INDEX idx_invitation_reminders_status
    ON event_invitation_reminders(status);