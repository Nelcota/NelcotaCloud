-- How long the receiver took on the last attempt, and the start of its answer when it
-- refused: what an owner needs to debug a failing receiver. Kept as long as the delivery.
ALTER TABLE webhook_deliveries
    ADD COLUMN last_duration_ms INTEGER CHECK (last_duration_ms >= 0),
    ADD COLUMN last_response_body TEXT CHECK (char_length(last_response_body) <= 512);

