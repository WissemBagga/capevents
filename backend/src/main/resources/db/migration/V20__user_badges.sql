CREATE TABLE user_badges (
                             id BIGSERIAL PRIMARY KEY,
                             user_id UUID NOT NULL,
                             badge_code VARCHAR(50) NOT NULL,
                             unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                             CONSTRAINT fk_user_badges_user
                                 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

                             CONSTRAINT uk_user_badges_user_code
                                 UNIQUE (user_id, badge_code)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_code ON user_badges(badge_code);