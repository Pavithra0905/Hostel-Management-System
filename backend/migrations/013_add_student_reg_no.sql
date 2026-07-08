-- ========================================
-- MIGRATION 013: Add Register Number (regNo) to students
-- Safe rollout for existing data
-- ========================================

USE hostel_management;

-- 1) Add nullable regNo first so existing rows remain valid during migration.
ALTER TABLE students
ADD COLUMN regNo VARCHAR(50) NULL AFTER userID;

-- 2) Backfill existing students with deterministic unique regNo values.
-- Replace this strategy if your institute has official register numbers.
UPDATE students
SET regNo = CONCAT('LEGACY-', LPAD(studentID, 6, '0'))
WHERE regNo IS NULL OR TRIM(regNo) = '';

-- 3) Enforce uniqueness.
ALTER TABLE students
ADD CONSTRAINT uq_students_regNo UNIQUE (regNo);

-- 4) Make regNo mandatory for all student rows going forward.
ALTER TABLE students
MODIFY COLUMN regNo VARCHAR(50) NOT NULL;
