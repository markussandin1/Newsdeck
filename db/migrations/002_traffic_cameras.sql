-- Migration: Traffic Cameras
-- Description: Stores metadata for Trafikverket traffic cameras

CREATE TABLE IF NOT EXISTS traffic_cameras (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    photo_url TEXT,
    photo_time TIMESTAMP WITH TIME ZONE,
    direction TEXT,
    camera_type TEXT,
    active BOOLEAN DEFAULT true,
    deleted BOOLEAN DEFAULT false,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial lookups (using simple B-tree on lat/lon for now, 
-- sufficient for distance calculations on small datasets)
CREATE INDEX IF NOT EXISTS idx_traffic_cameras_coords ON traffic_cameras (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_traffic_cameras_active_deleted ON traffic_cameras (active, deleted);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_traffic_cameras_updated_at
    BEFORE UPDATE ON traffic_cameras
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
