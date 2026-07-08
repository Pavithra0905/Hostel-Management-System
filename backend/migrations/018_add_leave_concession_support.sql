-- ========================================
-- MIGRATION 018: Leave requests + mess bill concession support
-- Rule: If approved leave days in month > 7, waive mess bill for all leave days
-- ========================================

USE hostel_management;

CREATE TABLE IF NOT EXISTS student_leave_requests (
    leaveID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    fromDate DATE NOT NULL,
    toDate DATE NOT NULL,
    totalDays INT NOT NULL,
    reason VARCHAR(500) NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    adminRemarks VARCHAR(500) NULL,
    approvedBy INT NULL,
    approvedAt DATETIME NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (approvedBy) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_leave_student_status (studentID, status),
    INDEX idx_leave_date_range (fromDate, toDate),
    INDEX idx_leave_status (status),
    CONSTRAINT chk_leave_dates CHECK (toDate >= fromDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE hostel_payments
  ADD COLUMN IF NOT EXISTS messDailyRate DECIMAL(10, 2) NOT NULL DEFAULT 120.00 AFTER feeAmount,
  ADD COLUMN IF NOT EXISTS leaveDaysCount INT NOT NULL DEFAULT 0 AFTER messDailyRate,
  ADD COLUMN IF NOT EXISTS effectiveMessDays INT NOT NULL DEFAULT 0 AFTER leaveDaysCount,
  ADD COLUMN IF NOT EXISTS messBillAmount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER effectiveMessDays,
  ADD COLUMN IF NOT EXISTS messConcessionAmount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER messBillAmount,
  ADD COLUMN IF NOT EXISTS netMessBillAmount DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER messConcessionAmount;
