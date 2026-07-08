-- ========================================
-- MIGRATION 015: Add ex-service and current staff fee waiver fields
-- ========================================

USE hostel_management;

-- Add isCurrentStaff column if it doesn't exist
-- (isExService and hostelFee columns already exist from previous migration)
SET @dbname = DATABASE();
SET @tablename = 'students';
SET @columnname = 'isCurrentStaff';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE
    (COLUMN_NAME = @columnname) AND
    (TABLE_NAME = @tablename) AND
    (TABLE_SCHEMA = @dbname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN NOT NULL DEFAULT FALSE AFTER isExService")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update fee calculation for all students
UPDATE students
SET hostelFee = CASE 
  WHEN isExService = TRUE THEN 0 
  WHEN isCurrentStaff = TRUE THEN 2500
  ELSE 5000 
END;
