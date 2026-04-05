CREATE TABLE notifications (
                               id BIGSERIAL PRIMARY KEY,
                               user_id UUID NOT NULL,
                               type VARCHAR(50) NOT NULL,
                               title VARCHAR(160) NOT NULL,
                               message TEXT NOT NULL,
                               action_path VARCHAR(255),
                               is_read BOOLEAN NOT NULL DEFAULT FALSE,
                               read_at TIMESTAMPTZ,
                               created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                               CONSTRAINT fk_notifications_user
                                   FOREIGN KEY (user_id) REFERENCES users(id)
                                       ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_created_at
    ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_user_is_read
    ON notifications(user_id, is_read);