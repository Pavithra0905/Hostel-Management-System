-- ========================================
-- MIGRATION 004: Update complaint category enum
-- Adds Regular + Critical complaint categories
-- ========================================

USE hostel_management;

ALTER TABLE complaints
MODIFY COLUMN category ENUM(
  'Electricity',
  'Water',
  'Cleanliness',
  'Food Issue',
  'Safety',
  'Health'
) NOT NULL;
