-- ========================================
-- MIGRATION 005: Admin specialization mapping
-- Enables dedicated critical-admin dashboards from login
-- ========================================

USE hostel_management;

CREATE TABLE IF NOT EXISTS admin_specializations (
    specializationID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL UNIQUE,
    complaintCategory ENUM('Food Issue', 'Safety', 'Health') NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(userID) ON DELETE CASCADE,
    INDEX idx_complaint_category (complaintCategory)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example assignments (adjust user email values if needed)
-- INSERT INTO admin_specializations (userID, complaintCategory)
-- SELECT userID, 'Food Issue' FROM users WHERE email = 'food.admin@hostel.com' AND role = 'Admin'
-- ON DUPLICATE KEY UPDATE complaintCategory = VALUES(complaintCategory);

-- INSERT INTO admin_specializations (userID, complaintCategory)
-- SELECT userID, 'Safety' FROM users WHERE email = 'safety.admin@hostel.com' AND role = 'Admin'
-- ON DUPLICATE KEY UPDATE complaintCategory = VALUES(complaintCategory);

-- INSERT INTO admin_specializations (userID, complaintCategory)
-- SELECT userID, 'Health' FROM users WHERE email = 'health.admin@hostel.com' AND role = 'Admin'
-- ON DUPLICATE KEY UPDATE complaintCategory = VALUES(complaintCategory);
