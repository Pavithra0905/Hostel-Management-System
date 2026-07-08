-- ========================================
-- MIGRATION 011: Add uploaded payment proof fields
-- Keeps student-uploaded proof separate from system-generated receipt
-- ========================================

USE hostel_management;

ALTER TABLE booking_requests
  ADD COLUMN IF NOT EXISTS paymentProofPath VARCHAR(500) NULL AFTER receiptMimeType,
  ADD COLUMN IF NOT EXISTS paymentProofOriginalName VARCHAR(255) NULL AFTER paymentProofPath,
  ADD COLUMN IF NOT EXISTS paymentProofMimeType VARCHAR(100) NULL AFTER paymentProofOriginalName;
