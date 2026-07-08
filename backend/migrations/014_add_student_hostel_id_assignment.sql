-- ========================================
-- MIGRATION 014: Add hostelID on students for admin assignment
-- ========================================

USE hostel_management;

ALTER TABLE students
ADD COLUMN hostelID VARCHAR(50) NULL AFTER regNo;
