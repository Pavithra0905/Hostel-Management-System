-- ========================================
-- MIGRATION 009: Add booking receipt fields
-- Adds fee receipt metadata columns to booking_requests table
-- ========================================

USE hostel_management;

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS receiptPath VARCHAR(500) NULL AFTER paidAt,
  ADD COLUMN IF NOT EXISTS receiptOriginalName VARCHAR(255) NULL AFTER receiptPath,
  ADD COLUMN IF NOT EXISTS receiptMimeType VARCHAR(100) NULL AFTER receiptOriginalName;
