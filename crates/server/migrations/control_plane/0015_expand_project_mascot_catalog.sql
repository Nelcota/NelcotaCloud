ALTER TABLE tenants
    DROP CONSTRAINT tenants_mascot_id_range,
    ADD CONSTRAINT tenants_mascot_id_range CHECK (mascot_id BETWEEN 0 AND 32);
