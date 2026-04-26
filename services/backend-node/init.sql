CREATE TABLE IF NOT EXISTS delivery_events (
    id SERIAL PRIMARY KEY,
    delivery_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);
