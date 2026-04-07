CREATE TABLE event_feedbacks (
                                 id BIGSERIAL PRIMARY KEY,
                                 event_id UUID NOT NULL,
                                 user_id UUID NOT NULL,
                                 rating INTEGER NOT NULL,
                                 comment TEXT,
                                 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                 updated_at TIMESTAMPTZ,

                                 CONSTRAINT fk_event_feedbacks_event
                                     FOREIGN KEY (event_id) REFERENCES events(id)
                                         ON DELETE CASCADE,

                                 CONSTRAINT fk_event_feedbacks_user
                                     FOREIGN KEY (user_id) REFERENCES users(id)
                                         ON DELETE CASCADE,

                                 CONSTRAINT uk_event_feedback_event_user
                                     UNIQUE (event_id, user_id),

                                 CONSTRAINT chk_event_feedback_rating
                                     CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX idx_event_feedbacks_event
    ON event_feedbacks(event_id);