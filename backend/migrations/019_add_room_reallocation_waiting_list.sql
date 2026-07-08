-- ========================================
-- MIGRATION 019: Automatic room reallocation with FIFO waiting list
-- Rule: Reallocate immediately after cancellation (FIFO waiting list)
-- ========================================

USE hostel_management;

CREATE TABLE IF NOT EXISTS room_waiting_list (
    waitingID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    roomID INT NOT NULL,
    status ENUM('Pending', 'Allocated', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
    remarks VARCHAR(500) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    allocatedAt DATETIME NULL,
    cancelledAt DATETIME NULL,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
    INDEX idx_waiting_room_status_created (roomID, status, createdAt),
    INDEX idx_waiting_student_status (studentID, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS room_reallocation_logs (
    reallocationLogID INT AUTO_INCREMENT PRIMARY KEY,
    roomID INT NOT NULL,
    waitingID INT NOT NULL,
    studentID INT NOT NULL,
    triggeredByAllocationID INT NULL,
    newAllocationID INT NOT NULL,
    ruleApplied VARCHAR(255) NOT NULL DEFAULT 'Immediate after cancellation, FIFO waiting list',
    notes VARCHAR(500) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
    FOREIGN KEY (waitingID) REFERENCES room_waiting_list(waitingID) ON DELETE CASCADE,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (triggeredByAllocationID) REFERENCES room_allocations(allocationID) ON DELETE SET NULL,
    FOREIGN KEY (newAllocationID) REFERENCES room_allocations(allocationID) ON DELETE CASCADE,
    INDEX idx_realloc_room_created (roomID, createdAt),
    INDEX idx_realloc_student_created (studentID, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
