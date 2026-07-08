-- ========================================
-- MIGRATION: Add Payment & Fee Management
-- Purpose: Track hostel fees, payments, and fines
-- ========================================

-- Add payment status column if needed
ALTER TABLE students ADD COLUMN IF NOT EXISTS monthlyFeeAmount DECIMAL(10, 2) DEFAULT 5000.00;

-- CREATE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS hostel_payments (
    paymentID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    month VARCHAR(7) NOT NULL COMMENT 'Format: YYYY-MM',
    feeAmount DECIMAL(10, 2) NOT NULL,
    fineAmount DECIMAL(10, 2) DEFAULT 0 COMMENT 'Late payment fine',
    totalAmount DECIMAL(10, 2) NOT NULL COMMENT 'feeAmount + fineAmount',
    paidAmount DECIMAL(10, 2) DEFAULT 0,
    paymentStatus ENUM('Pending', 'Partial', 'Full', 'Overdue') DEFAULT 'Pending',
    paymentDueDate DATE NOT NULL,
    paymentDate TIMESTAMP NULL COMMENT 'When the payment was made',
    paymentMethod ENUM('Cash', 'Online Transfer', 'Cheque', 'UPI') DEFAULT 'Online Transfer',
    receiptNumber VARCHAR(50) UNIQUE NULL,
    remarks TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    INDEX idx_student (studentID),
    INDEX idx_month (month),
    INDEX idx_status (paymentStatus),
    INDEX idx_dueDate (paymentDueDate),
    UNIQUE KEY unique_student_month (studentID, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE PAYMENT RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS payment_receipts (
    receiptID INT AUTO_INCREMENT PRIMARY KEY,
    paymentID INT NOT NULL,
    receiptNumber VARCHAR(50) NOT NULL UNIQUE,
    generatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generatedBy INT COMMENT 'Admin or Warden userID',
    pdfPath VARCHAR(255) NULL COMMENT 'Path to generated PDF receipt',
    FOREIGN KEY (paymentID) REFERENCES hostel_payments(paymentID) ON DELETE CASCADE,
    FOREIGN KEY (generatedBy) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_receipt_number (receiptNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE FINE RULES TABLE
CREATE TABLE IF NOT EXISTS fine_rules (
    ruleID INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    daysLate INT NOT NULL COMMENT 'Days after due date',
    finePercentage DECIMAL(5, 2) NOT NULL COMMENT 'Percentage of fee',
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CREATE PAYMENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS payment_history (
    historyID INT AUTO_INCREMENT PRIMARY KEY,
    paymentID INT NOT NULL,
    previousStatus ENUM('Pending', 'Partial', 'Full', 'Overdue') NOT NULL,
    newStatus ENUM('Pending', 'Partial', 'Full', 'Overdue') NOT NULL,
    amountPaid DECIMAL(10, 2) NOT NULL,
    changedBy INT NOT NULL COMMENT 'Admin or Warden',
    reason TEXT,
    changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paymentID) REFERENCES hostel_payments(paymentID) ON DELETE CASCADE,
    FOREIGN KEY (changedBy) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_payment (paymentID),
    INDEX idx_changed_date (changedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INSERT DEFAULT FINE RULES
INSERT INTO fine_rules (name, daysLate, finePercentage, isActive) VALUES
('No Fine', 0, 0, TRUE),
('5 days late', 5, 5, TRUE),
('10 days late', 10, 10, TRUE),
('15 days late', 15, 15, TRUE),
('30 days late', 30, 25, TRUE);

-- INSERT SAMPLE PAYMENTS FOR EXISTING STUDENTS
INSERT INTO hostel_payments (studentID, month, feeAmount, totalAmount, paymentDueDate, paymentStatus)
SELECT 
    s.studentID,
    DATE_FORMAT(NOW(), '%Y-%m') as month,
    COALESCE(s.monthlyFeeAmount, 5000) as feeAmount,
    COALESCE(s.monthlyFeeAmount, 5000) as totalAmount,
    DATE_ADD(LAST_DAY(NOW()), INTERVAL 1 DAY) as paymentDueDate,
    'Pending' as paymentStatus
FROM students s
WHERE NOT EXISTS (
    SELECT 1 FROM hostel_payments hp 
    WHERE hp.studentID = s.studentID 
    AND hp.month = DATE_FORMAT(NOW(), '%Y-%m')
);
