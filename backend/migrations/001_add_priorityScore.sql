-- Migration: add priorityScore to complaints
-- Run this file against your MySQL database if the column is missing.

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS priorityScore INT DEFAULT 0;
