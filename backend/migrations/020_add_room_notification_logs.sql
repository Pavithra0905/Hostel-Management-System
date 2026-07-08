-- ========================================
-- MIGRATION 020: Room cancellation and email notification logs
-- Purpose: Store readable notification history in database
-- ========================================

USE hostel_management;

CREATE TABLE IF NOT EXISTS room_notification_logs (
    notificationLogID INT AUTO_INCREMENT PRIMARY KEY,
    allocationID INT NOT NULL,
    studentID INT NOT NULL,
    roomID INT NOT NULL,
    eventType ENUM('Room Cancelled', 'Room Allocated', 'Email Sent', 'Email Failed') NOT NULL,
    message TEXT NOT NULL,
    emailTo VARCHAR(255) NULL,
    emailStatus ENUM('Pending', 'Sent', 'Failed', 'Not Required') NOT NULL DEFAULT 'Not Required',
    emailMessageID VARCHAR(255) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (allocationID) REFERENCES room_allocations(allocationID) ON DELETE CASCADE,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
    INDEX idx_room_notification_allocation (allocationID),
    INDEX idx_room_notification_student (studentID),
    INDEX idx_room_notification_event (eventType),
    INDEX idx_room_notification_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;