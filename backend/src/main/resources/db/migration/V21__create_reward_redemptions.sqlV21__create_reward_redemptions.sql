CREATE TABLE reward_redemptions (
                                    id BIGSERIAL PRIMARY KEY,
                                    user_id UUID NOT NULL,
                                    reward_code VARCHAR(50) NOT NULL,
                                    points_spent INTEGER NOT NULL,
                                    status VARCHAR(50) NOT NULL,
                                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                                    CONSTRAINT fk_reward_redemptions_user
                                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reward_redemptions_user_id
    ON reward_redemptions(user_id);

CREATE INDEX idx_reward_redemptions_created_at
    ON reward_redemptions(created_at DESC);