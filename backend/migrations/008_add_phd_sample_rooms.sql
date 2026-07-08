-- ========================================
-- MIGRATION 008: Add sample PhD rooms
-- Adds 4 PhD-designated rooms with attached bathroom and WiFi
-- Safe to run multiple times (uses INSERT IGNORE)
-- ========================================

USE hostel_management;

INSERT IGNORE INTO rooms (roomNumber, type, roomCategory, capacity, occupancy, facilities, status, floor, hostelBlock) VALUES
('A105', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'A'),
('A106', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'A'),
('B105', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'B'),
('B106', 'Single', 'PhD', 1, 0, 'Attached Bathroom, Study Table, Bed, Wardrobe, WiFi', 'Available', 1, 'B');
