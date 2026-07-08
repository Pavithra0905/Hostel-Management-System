-- ========================================
-- MIGRATION 016: Add fines management table
-- ========================================

USE hostel_management;

CREATE TABLE IF NOT EXISTS fines (
    fineID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    date DATE NOT NULL,
    hoursLate INT NOT NULL,
    fineAmount DECIMAL(10, 2) NOT NULL,
    status ENUM('Pending', 'Paid') NOT NULL DEFAULT 'Pending',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    INDEX idx_student (studentID),
    INDEX idx_date (date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
