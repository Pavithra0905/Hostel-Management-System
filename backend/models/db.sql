-- ========================================
-- HOSTEL MANAGEMENT SYSTEM DATABASE SCHEMA
-- ========================================
-- MySQL Database Schema for XAMPP
-- Created for Final Year Software Engineering Lab Project
-- ========================================

-- IMPORTANT:
-- Do NOT drop the database automatically here, to avoid accidental data loss.
-- If you need a full reset, drop manually after taking a backup.
CREATE DATABASE IF NOT EXISTS hostel_management;
USE hostel_management;


-- ========================================
-- TABLE 1: USERS
-- Purpose: Store user authentication and role information
-- ========================================
CREATE TABLE users (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashedPassword VARCHAR(255) NOT NULL,
    role ENUM('Student', 'Warden', 'Admin') NOT NULL,
    hostelID INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 1A: ADMIN SPECIALIZATIONS
-- Purpose: Map Admin users to a specific critical complaint category
-- ========================================
CREATE TABLE admin_specializations (
    specializationID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL UNIQUE,
    complaintCategory ENUM('Food Issue', 'Safety', 'Health') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
    INDEX idx_complaint_category (complaintCategory)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 2: STUDENTS
-- Purpose: Store student-specific information
-- ========================================
CREATE TABLE students (
    studentID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL UNIQUE,
    regNo VARCHAR(50) NOT NULL UNIQUE,
    hostelID VARCHAR(50) NULL,
    isExService BOOLEAN NOT NULL DEFAULT FALSE,
    isCurrentStaff BOOLEAN NOT NULL DEFAULT FALSE,
    hostelFee DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    name VARCHAR(255) NOT NULL,
    year ENUM('First', 'Second', 'Third', 'Final', 'PhD') NOT NULL,
    department VARCHAR(100),
    phoneNumber VARCHAR(15),
    guardianContact VARCHAR(15),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
    INDEX idx_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 3: ROOMS
-- Purpose: Store room inventory and status
-- ========================================
CREATE TABLE rooms (
    roomID INT AUTO_INCREMENT PRIMARY KEY,
    roomNumber VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('Single', 'Double') NOT NULL,
    roomCategory ENUM('Regular', 'PhD') NOT NULL DEFAULT 'Regular',
    capacity INT NOT NULL,
    occupancy INT DEFAULT 0,
    facilities TEXT,
    status ENUM('Available', 'Occupied', 'Maintenance') DEFAULT 'Available',
    floor INT,
    hostelBlock VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type),
    CONSTRAINT chk_occupancy CHECK (occupancy <= capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 4: ROOM ALLOCATIONS
-- Purpose: Track room allocation history and current assignments
-- ========================================
CREATE TABLE room_allocations (
    allocationID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    roomID INT NOT NULL,
    allocatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    releaseDate TIMESTAMP NULL,
    status ENUM('Active', 'Cancelled', 'Completed') DEFAULT 'Active',
    allocatedBy INT,
    remarks TEXT,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
    FOREIGN KEY (allocatedBy) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_student (studentID),
    INDEX idx_room (roomID),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 5: ROLE PERMISSIONS
-- Purpose: Map roles to specific permissions
-- ========================================
CREATE TABLE role_permissions (
    permissionID INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('Student', 'Warden', 'Admin') NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE KEY unique_role_resource_action (role, resource, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 6: PASSWORD RESET TOKENS
-- Purpose: Store password reset tokens with expiration
-- ========================================
CREATE TABLE password_reset_tokens (
    tokenID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiresAt TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 7: UNAUTHORIZED ACCESS LOGS
-- Purpose: Log unauthorized access attempts for security monitoring
-- ========================================
CREATE TABLE unauthorized_access_logs (
    logID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NULL,
    endpoint VARCHAR(255) NOT NULL,
    ipAddress VARCHAR(45),
    attemptTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255),
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_userID (userID),
    INDEX idx_attemptTime (attemptTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 8: ALLOCATION LOGS
-- Purpose: Track allocation processing time and performance
-- ========================================
CREATE TABLE allocation_logs (
    logID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT,
    roomID INT NULL,
    processingTime INT,
    success BOOLEAN,
    message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- INSERT DEFAULT ROLE PERMISSIONS
-- ========================================
INSERT INTO role_permissions (role, resource, action, description) VALUES
-- Admin Permissions
('Admin', 'users', 'create', 'Can create new users'),
('Admin', 'users', 'read', 'Can view user information'),
('Admin', 'users', 'update', 'Can update user information'),
('Admin', 'users', 'delete', 'Can delete users'),
('Admin', 'rooms', 'create', 'Can create rooms'),
('Admin', 'rooms', 'read', 'Can view rooms'),
('Admin', 'rooms', 'update', 'Can update rooms'),
('Admin', 'rooms', 'delete', 'Can delete rooms'),
('Admin', 'allocations', 'approve', 'Can approve room allocations'),
('Admin', 'allocations', 'cancel', 'Can cancel room allocations'),
('Admin', 'reports', 'view', 'Can view system reports'),

-- Warden Permissions
('Warden', 'rooms', 'read', 'Can view rooms'),
('Warden', 'rooms', 'update', 'Can update room status'),
('Warden', 'allocations', 'approve', 'Can approve room allocations'),
('Warden', 'allocations', 'read', 'Can view allocations'),
('Warden', 'students', 'read', 'Can view student information'),

-- Student Permissions
('Student', 'rooms', 'read', 'Can view available rooms'),
('Student', 'allocations', 'request', 'Can request room booking'),
('Student', 'allocations', 'read', 'Can view own allocation history');

-- ========================================
-- INSERT SAMPLE DATA FOR TESTING
-- ========================================

-- Insert Sample Admin User (password: Admin@123)
INSERT INTO users (email, hashedPassword, role) VALUES 
('admin@hostel.com', '$2b$10$8JKxQxK0h5Y7p5Zk5xQxKe5Y7p5Zk5xQxKe5Y7p5Zk5xQxKe5Y7p5O', 'Admin');

-- Insert Sample Warden User (password: Warden@123)
INSERT INTO users (email, hashedPassword, role) VALUES 
('warden@hostel.com', '$2b$10$8JKxQxK0h5Y7p5Zk5xQxKe5Y7p5Zk5xQxKe5Y7p5Zk5xQxKe5Y7p5O', 'Warden');

-- Insert Sample Rooms
-- Single Rooms (for Final Year students)
INSERT INTO rooms (roomNumber, type, capacity, occupancy, facilities, status, floor, hostelBlock) VALUES
('A101', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'A'),
('A102', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'A'),
('A201', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 2, 'A'),
('A202', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 2, 'A'),
('B101', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'B'),
('B102', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'B'),

-- Double Rooms (for Third Year students)
('A103', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 1, 'A'),
('A104', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 1, 'A'),
('A203', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 2, 'A'),
('A204', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 2, 'A'),
('A301', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 3, 'A'),
('A302', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 3, 'A'),
('A303', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 3, 'A'),
('A304', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 3, 'A'),
('B103', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 1, 'B'),
('B104', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 1, 'B'),
('B203', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 2, 'B'),
('B204', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 2, 'B'),
('B301', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 3, 'B'),
('B302', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 3, 'B'),
('B303', 'Double', 2, 0, 'Shared Bathroom, 2 Study Tables, 2 Beds, 2 Wardrobes, WiFi', 'Available', 3, 'B'),
('B304', 'Single', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 3, 'B');

-- PhD Rooms (single occupancy, premium facilities)
INSERT INTO rooms (roomNumber, type, roomCategory, capacity, occupancy, facilities, status, floor, hostelBlock) VALUES
('A105', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'A'),
('A106', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'A'),
('B105', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'B'),
('B106', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'B');

-- ========================================
-- USEFUL VIEWS FOR REPORTING
-- ========================================

-- View: Active Allocations with Student and Room Details
CREATE VIEW active_allocations_view AS
SELECT 
    ra.allocationID,
    s.studentID,
    s.name AS studentName,
    s.year,
    u.email,
    r.roomID,
    r.roomNumber,
    r.type AS roomType,
    r.hostelBlock,
    ra.allocatedDate,
    ra.status
FROM room_allocations ra
JOIN students s ON ra.studentID = s.studentID
JOIN users u ON s.userID = u.userID
JOIN rooms r ON ra.roomID = r.roomID
WHERE ra.status = 'Active';

-- View: Room Availability Statistics
CREATE VIEW room_statistics_view AS
SELECT 
    type,
    COUNT(*) AS total_rooms,
    SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available_rooms,
    SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_rooms,
    SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance_rooms
FROM rooms
GROUP BY type;

-- View: Allocation Count by Year
CREATE VIEW allocation_by_year_view AS
SELECT 
    s.year,
    COUNT(ra.allocationID) AS total_allocations,
    SUM(CASE WHEN ra.status = 'Active' THEN 1 ELSE 0 END) AS active_allocations
FROM students s
LEFT JOIN room_allocations ra ON s.studentID = ra.studentID
GROUP BY s.year
ORDER BY 
    FIELD(s.year, 'Final', 'Third', 'Second', 'First');

-- ========================================
-- STORED PROCEDURES
-- ========================================

-- Procedure to get available rooms for a student based on year
DELIMITER //
CREATE PROCEDURE GetAvailableRoomsForYear(IN student_year ENUM('First', 'Second', 'Third', 'Final'))
BEGIN
    IF student_year = 'Final' THEN
        -- Final year students get Single rooms
        SELECT * FROM rooms 
        WHERE type = 'Single' AND status = 'Available' AND occupancy < capacity
        ORDER BY roomNumber;
    ELSEIF student_year = 'Third' THEN
        -- Third year students get Double rooms
        SELECT * FROM rooms 
        WHERE type = 'Double' AND status = 'Available' AND occupancy < capacity
        ORDER BY roomNumber;
    ELSE
        -- Other years get any available rooms
        SELECT * FROM rooms 
        WHERE status = 'Available' AND occupancy < capacity
        ORDER BY type, roomNumber;
    END IF;
END //
DELIMITER ;

-- ========================================
-- TABLE 9: BOOKING REQUESTS
-- Purpose: Store detailed booking requests with dates, duration, food status, fees
-- ========================================
CREATE TABLE booking_requests (
    bookingID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    roomID INT NOT NULL,
    startDate DATE NOT NULL,
    duration INT NOT NULL,
    noOfSeaters INT NOT NULL,
    foodRequired BOOLEAN DEFAULT FALSE,
    foodCost DECIMAL(10, 2),
    monthlyFee DECIMAL(10, 2),
    totalAmount DECIMAL(10, 2),
    paymentStatus ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid',
    paidAt TIMESTAMP NULL,
    receiptPath VARCHAR(500) NULL,
    receiptOriginalName VARCHAR(255) NULL,
    receiptMimeType VARCHAR(100) NULL,
    paymentProofPath VARCHAR(500) NULL,
    paymentProofOriginalName VARCHAR(255) NULL,
    paymentProofMimeType VARCHAR(100) NULL,
    status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending',
    remarks TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
    INDEX idx_student (studentID),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 10: BOOKING_PAYMENT_TRANSACTIONS
-- Purpose: Store payment transaction history for each booking request
-- ========================================
CREATE TABLE booking_payment_transactions (
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

-- ========================================
-- TABLE 11: COMPLAINTS
-- Purpose: Students raise complaints; Warden assigns maintenance
-- ========================================
CREATE TABLE complaints (
    complaintID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    roomID INT NOT NULL,
    category ENUM('Electricity','Water','Cleanliness','Food Issue','Safety','Health') NOT NULL,
    description TEXT,
    urgency ENUM('Low','Medium','High','Critical') DEFAULT 'Medium',
    priorityScore INT DEFAULT 0,
    status ENUM('Open','In Progress','Resolved') DEFAULT 'Open',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (roomID) REFERENCES rooms(roomID) ON DELETE CASCADE,
    INDEX idx_complaint_status (status),
    INDEX idx_complaint_student (studentID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 11: MAINTENANCE_LOGS
-- Purpose: Track assignment and resolution actions for complaints
-- ========================================
CREATE TABLE maintenance_logs (
    logID INT AUTO_INCREMENT PRIMARY KEY,
    complaintID INT NOT NULL,
    assignedBy INT NULL,
    assignedTo VARCHAR(255),
    remarks TEXT,
    status ENUM('In Progress','Resolved') DEFAULT 'In Progress',
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (complaintID) REFERENCES complaints(complaintID) ON DELETE CASCADE,
    INDEX idx_log_complaint (complaintID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 12: SAFE_ZONES
-- Purpose: Define geofenced safe areas around hostel premises
-- ========================================
CREATE TABLE safe_zones (
    safeZoneID INT AUTO_INCREMENT PRIMARY KEY,
    zoneName VARCHAR(100) NOT NULL,
    centerLatitude DECIMAL(10, 7) NOT NULL,
    centerLongitude DECIMAL(10, 7) NOT NULL,
    radiusMeters INT NOT NULL DEFAULT 500,
    isActive TINYINT(1) NOT NULL DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_safe_zone_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 13: LOCATION_LOGS
-- Purpose: Store periodic student GPS points for safety monitoring
-- ========================================
CREATE TABLE location_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    safeZoneID INT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    timestamp DATETIME NOT NULL,
    isInsideSafeZone TINYINT(1) NOT NULL DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (safeZoneID) REFERENCES safe_zones(safeZoneID) ON DELETE SET NULL,
    INDEX idx_location_student_time (studentID, timestamp),
    INDEX idx_location_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 14: SAFETY_VIOLATIONS
-- Purpose: Log violations whenever a student moves outside safe zone
-- ========================================
CREATE TABLE safety_violations (
    violationID BIGINT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    locationLogID BIGINT NOT NULL,
    violationType ENUM('OUTSIDE_SAFE_ZONE') NOT NULL DEFAULT 'OUTSIDE_SAFE_ZONE',
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    occurredAt DATETIME NOT NULL,
    status ENUM('OPEN', 'ACKNOWLEDGED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (locationLogID) REFERENCES location_logs(id) ON DELETE CASCADE,
    INDEX idx_violation_student (studentID),
    INDEX idx_violation_time (occurredAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 15: EMERGENCY_ALERTS
-- Purpose: Capture panic button triggers and response lifecycle
-- ========================================
CREATE TABLE emergency_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    message TEXT NOT NULL,
    locationText VARCHAR(255) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    timestamp DATETIME NOT NULL,
    status ENUM('pending', 'resolved', 'escalated') NOT NULL DEFAULT 'pending',
    response_time_minutes INT NULL,
    resolvedAt DATETIME NULL,
    resolvedBy INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (resolvedBy) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_alert_status_time (status, timestamp),
    INDEX idx_alert_student (studentID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- TABLE 16: INCIDENT_REPORTS
-- Purpose: Track actions taken for safety incidents
-- ========================================
CREATE TABLE incident_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    emergencyAlertID BIGINT NULL,
    studentID INT NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    timestamp DATETIME NOT NULL,
    createdBy INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emergencyAlertID) REFERENCES emergency_alerts(id) ON DELETE SET NULL,
    FOREIGN KEY (studentID) REFERENCES students(studentID) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(userID) ON DELETE SET NULL,
    INDEX idx_incident_student_time (studentID, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO safe_zones (zoneName, centerLatitude, centerLongitude, radiusMeters, isActive)
VALUES ('Main Hostel Campus', 12.9715987, 77.5945627, 500, 1);

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger: Auto-update room status when occupancy changes
DELIMITER //
CREATE TRIGGER update_room_status_after_occupancy
BEFORE UPDATE ON rooms
FOR EACH ROW
BEGIN
    IF NEW.occupancy >= NEW.capacity THEN
        SET NEW.status = 'Occupied';
    ELSEIF NEW.occupancy = 0 AND OLD.status = 'Occupied' THEN
        SET NEW.status = 'Available';
    END IF;
END //
DELIMITER ;

-- ========================================
-- DATABASE SETUP COMPLETE
-- ========================================
-- To use this schema:
-- 1. Start XAMPP and ensure MySQL is running
-- 2. Open phpMyAdmin (http://localhost/phpmyadmin)
-- 3. Click on "SQL" tab
-- 4. Copy and paste this entire script
-- 5. Click "Go" to execute
-- ========================================
