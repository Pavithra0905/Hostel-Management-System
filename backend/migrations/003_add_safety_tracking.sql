-- ========================================
-- MIGRATION 003: SAFETY TRACKING MODULE
-- Adds location tracking, safe zones, emergency alerts and incidents
-- ========================================

CREATE TABLE IF NOT EXISTS safe_zones (
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

CREATE TABLE IF NOT EXISTS location_logs (
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

CREATE TABLE IF NOT EXISTS safety_violations (
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

CREATE TABLE IF NOT EXISTS emergency_alerts (
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

CREATE TABLE IF NOT EXISTS incident_reports (
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
SELECT 'Main Hostel Campus', 12.9715987, 77.5945627, 500, 1
WHERE NOT EXISTS (
    SELECT 1 FROM safe_zones WHERE isActive = 1
);
