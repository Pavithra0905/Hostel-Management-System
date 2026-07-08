-- ========================================
-- MIGRATION 012: Fix rooms occupancy trigger
-- Resolves MySQL error 1442 by avoiding self-update in trigger
-- ========================================

USE hostel_management;

DROP TRIGGER IF EXISTS update_room_status_after_occupancy;

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
