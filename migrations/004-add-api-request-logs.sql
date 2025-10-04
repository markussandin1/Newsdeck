-- Migration: Add API request logging
-- Date: 2025-10-04
-- Description: Create table to log all API POST requests for debugging

CREATE TABLE IF NOT EXISTS api_request_logs (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries on common filters
CREATE INDEX idx_api_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX idx_api_logs_success ON api_request_logs(success);
CREATE INDEX idx_api_logs_endpoint ON api_request_logs(endpoint);
