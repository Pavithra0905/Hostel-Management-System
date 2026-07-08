-- ========================================
-- MIGRATION 017: Add student movement logs for in/out fine rules
-- ========================================

CREATE TABLE IF NOT EXISTS student_movement_logs (
    movementID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    outDateTime DATETIME NOT NULL,
    expectedInDateTime DATETIME NOT NULL,
    actualInDateTime DATETIME NULL,
    lateMinutes INT NOT NULL DEFAULT 0,
    hoursLate INT NOT NULL DEFAULT 0,
    fineAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    fineGenerated TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('Out', 'Returned', 'No Report') NOT NULL DEFAULT 'Out',
    notes VARCHAR(255) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    INDEX idx_student_status (studentID, status),
    INDEX idx_expected (expectedInDateTime),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;