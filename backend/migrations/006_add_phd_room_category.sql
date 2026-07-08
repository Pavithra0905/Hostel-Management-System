-- Add PhD room category support and default existing rooms to Regular
USE hostel_management;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS roomCategory ENUM('Regular', 'PhD') NOT NULL DEFAULT 'Regular' AFTER type;

-- Ensure all existing rooms are marked Regular (safety update)
UPDATE rooms
SET roomCategory = 'Regular'
WHERE roomCategory IS NULL;
