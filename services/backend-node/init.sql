CREATE TABLE IF NOT EXISTS delivery_events (
  id SERIAL PRIMARY KEY,
  delivery_id VARCHAR(50),
  event_type VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
