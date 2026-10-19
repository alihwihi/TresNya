// Namespaced, additive schema. Existing public tables and local SQLite data are untouched.
const schema = `
CREATE SCHEMA IF NOT EXISTS tresnya;
CREATE TABLE IF NOT EXISTS tresnya.accounts (
  username TEXT PRIMARY KEY CHECK (username IN ('alih','nana')),
  salt TEXT NOT NULL, password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tresnya.sessions (
  token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES tresnya.accounts(username), expires DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS tresnya.login_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires DOUBLE PRECISION NOT NULL);
CREATE TABLE IF NOT EXISTS tresnya.checkins (
  id SERIAL PRIMARY KEY, username TEXT NOT NULL REFERENCES tresnya.accounts(username),
  latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, accuracy DOUBLE PRECISION NOT NULL,
  label TEXT NOT NULL, captured DOUBLE PRECISION NOT NULL, created DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS checkins_owner ON tresnya.checkins(username,id DESC);
CREATE TABLE IF NOT EXISTS tresnya.statuses (
  id TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES tresnya.accounts(username), text TEXT NOT NULL, created DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS statuses_owner ON tresnya.statuses(username,created DESC);
CREATE TABLE IF NOT EXISTS tresnya.push_devices (
  endpoint TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES tresnya.accounts(username),
  session_hash TEXT NOT NULL REFERENCES tresnya.sessions(token_hash) ON DELETE CASCADE, subscription JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS tresnya.push_queue (
  id SERIAL PRIMARY KEY, status_id TEXT NOT NULL REFERENCES tresnya.statuses(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL REFERENCES tresnya.push_devices(endpoint) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0, next_try DOUBLE PRECISION NOT NULL,
  lease_until DOUBLE PRECISION NOT NULL DEFAULT 0, lease_token TEXT,
  UNIQUE(status_id,endpoint)
);
CREATE TABLE IF NOT EXISTS tresnya.app_settings (key TEXT PRIMARY KEY,value JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS tresnya.live_locations (
  username TEXT PRIMARY KEY REFERENCES tresnya.accounts(username),
  session_hash TEXT NOT NULL REFERENCES tresnya.sessions(token_hash) ON DELETE CASCADE,
  share_id TEXT NOT NULL,started DOUBLE PRECISION NOT NULL,expires DOUBLE PRECISION NOT NULL,
  sequence INTEGER NOT NULL,photo TEXT,latitude DOUBLE PRECISION,longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,captured DOUBLE PRECISION,updated DOUBLE PRECISION
);
ALTER TABLE tresnya.live_locations ADD COLUMN IF NOT EXISTS lease_ms INTEGER NOT NULL DEFAULT 45000;
`;
module.exports = { schema };
