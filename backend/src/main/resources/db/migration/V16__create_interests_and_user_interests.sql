CREATE TABLE interests (
                           id BIGSERIAL PRIMARY KEY,
                           code VARCHAR(50) NOT NULL UNIQUE,
                           label_fr VARCHAR(120) NOT NULL UNIQUE,
                           display_order INTEGER NOT NULL,
                           is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE user_interests (
                                user_id UUID NOT NULL,
                                interest_id BIGINT NOT NULL,
                                PRIMARY KEY (user_id, interest_id),

                                CONSTRAINT fk_user_interests_user
                                    FOREIGN KEY (user_id) REFERENCES users(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT fk_user_interests_interest
                                    FOREIGN KEY (interest_id) REFERENCES interests(id)
                                        ON DELETE CASCADE
);

CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest ON user_interests(interest_id);

INSERT INTO interests (code, label_fr, display_order, is_active) VALUES
                           ('SPORT_ACTIVITE', 'Sport et activité physique', 1, TRUE),
                           ('BIEN_ETRE_EQUILIBRE', 'Bien-être et équilibre', 2, TRUE),
                           ('SANTE_PREVENTION', 'Santé et prévention', 3, TRUE),
                           ('TECHNOLOGIE', 'Technologie', 4, TRUE),
                           ('IA_DATA', 'IA et data', 5, TRUE),
                           ('CYBERSECURITE', 'Cybersécurité', 6, TRUE),
                           ('INNOVATION', 'Innovation', 7, TRUE),
                           ('FORMATION_METIER', 'Formation métier', 8, TRUE),
                           ('LEADERSHIP', 'Leadership', 9, TRUE),
                           ('GESTION_PROJET', 'Gestion de projet', 10, TRUE),
                           ('COMMUNICATION', 'Communication', 11, TRUE),
                           ('NETWORKING', 'Networking', 12, TRUE),
                           ('TEAM_BUILDING', 'Team building', 13, TRUE),
                           ('CULTURE_ENTREPRISE', 'Culture d''entreprise', 14, TRUE),
                           ('RSE', 'RSE', 15, TRUE),
                           ('SOLIDARITE_BENEVOLAT', 'Solidarité et bénévolat', 16, TRUE),
                           ('DIVERSITE_INCLUSION', 'Diversité et inclusion', 17, TRUE),
                           ('CULTURE_LOISIRS', 'Culture et loisirs', 18, TRUE),
                           ('SORTIES_DECOUVERTES', 'Sorties et découvertes', 19, TRUE),
                           ('ENTREPRENEURIAT', 'Entrepreneuriat', 20, TRUE);