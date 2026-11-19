ALTER TABLE tenants
    ADD COLUMN mascot_id SMALLINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT tenants_mascot_id_range CHECK (mascot_id BETWEEN 0 AND 16);
