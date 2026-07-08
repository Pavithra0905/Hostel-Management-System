-- Fix booking_requests table
USE hostel_management;

-- Check if table exists and create if missing
CREATE TABLE IF NOT EXISTS booking_requests (
    bookingID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    roomID INT NOT NULL,
    startDate DATE NOT NULL,
    duration INT NOT NULL,
    noOfSeaters INT NOT NULL,
    foodRequired BOOLEAN DEFAULT FALSE,
    foodCost DECIMAL(10, 2) DEFAULT 0,
    monthlyFee DECIMAL(10, 2) NOT NULL,
    totalAmount DECIMAL(10, 2) NOT NULL,
    paymentStatus ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid',
    paidAt TIMESTAMP NULL,
    status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending',
    remarks TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
    INDEX idx_student (studentID),
    INDEX idx_room (roomID),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure payment fields exist for already-created tables
ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS paymentStatus ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid';

ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS paidAt TIMESTAMP NULL;

-- Verify table was created
SELECT 'booking_requests table created/verified successfully' AS Status;

-- Show table structure
DESCRIBE booking_requests;
