-- Extend student year enum to include PhD
ALTER TABLE students
  MODIFY COLUMN year ENUM('First', 'Second', 'Third', 'Final', 'PhD') NOT NULL;
