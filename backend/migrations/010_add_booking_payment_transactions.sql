-- ========================================
-- MIGRATION 010: Add booking payment transaction history table
-- ========================================

USE hostel_management;

CREATE TABLE IF NOT EXISTS booking_payment_transactions (
    transactionID INT AUTO_INCREMENT PRIMARY KEY,
    transactionReference VARCHAR(50) NOT NULL UNIQUE,
    bookingID INT NOT NULL,
    studentID INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    paymentStatus ENUM('Pending', 'Paid', 'Failed') DEFAULT 'Pending',
    paymentMethod VARCHAR(50) DEFAULT 'Manual/Receipt Upload',
    receiptPath VARCHAR(500) NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bookingID) REFERENCES booking_requests(bookingID) ON DELETE CASCADE,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    INDEX idx_booking_payment_booking (bookingID),
    INDEX idx_booking_payment_student (studentID),
    INDEX idx_booking_payment_status (paymentStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill one transaction per existing booking if missing
INSERT INTO booking_payment_transactions (
    transactionReference,
    bookingID,
    studentID,
    amount,
    paymentStatus,
    paymentMethod,
    receiptPath,
    notes
)
SELECT
    CONCAT('BKTXN-', LPAD(br.bookingID, 8, '0')),
    br.bookingID,
    br.studentID,
    COALESCE(br.totalAmount, 0),
    CASE WHEN br.paymentStatus = 'Paid' THEN 'Paid' ELSE 'Pending' END,
    'Manual/Receipt Upload',
    br.receiptPath,
    'Backfilled from existing booking record'
FROM booking_requests br
LEFT JOIN booking_payment_transactions bpt ON bpt.bookingID = br.bookingID
WHERE bpt.bookingID IS NULL;
