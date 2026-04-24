ALTER TABLE points_transactions
    ALTER COLUMN event_id DROP NOT NULL;

ALTER TABLE reward_redemptions
    ADD COLUMN IF NOT EXISTS hr_comment VARCHAR(1000);

ALTER TABLE reward_redemptions
    ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;

ALTER TABLE reward_redemptions
    ADD COLUMN IF NOT EXISTS handled_by UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_reward_redemptions_handled_by'
    ) THEN
ALTER TABLE reward_redemptions
    ADD CONSTRAINT fk_reward_redemptions_handled_by
        FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL;
END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status_created_at
    ON reward_redemptions(status, created_at DESC);