CREATE TABLE points_transactions (
                                     id BIGSERIAL PRIMARY KEY,
                                     user_id UUID NOT NULL,
                                     event_id UUID NOT NULL,
                                     type VARCHAR(50) NOT NULL,
                                     points_delta INTEGER NOT NULL,
                                     reason VARCHAR(255) NOT NULL,
                                     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                                     CONSTRAINT fk_points_transactions_user
                                         FOREIGN KEY (user_id) REFERENCES users(id)
                                             ON DELETE CASCADE,

                                     CONSTRAINT fk_points_transactions_event
                                         FOREIGN KEY (event_id) REFERENCES events(id)
                                             ON DELETE CASCADE
);

CREATE INDEX idx_points_transactions_user_created_at
    ON points_transactions(user_id, created_at DESC);

CREATE INDEX idx_points_transactions_user_event_type
    ON points_transactions(user_id, event_id, type);