-- ========================================
-- DIAGNOSTIC CHECK FOR BOOKING SYSTEM
-- Run this in phpMyAdmin to diagnose issues
-- ========================================

USE hostel_management;

-- TEST 1: Check if booking_requests table exists
SELECT 
    '1. Table Check' as Test,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ booking_requests table EXISTS'
        ELSE '❌ booking_requests table MISSING - Need to create it'
    END as Result
FROM information_schema.tables 
WHERE table_schema = 'hostel_management' 
AND table_name = 'booking_requests';

SELECT
    '2. User/Student Check' AS Test,
    u.userID,
    u.email,
    u.role,
    CASE
        WHEN s.studentID IS NOT NULL THEN CONCAT('✅ Student ID: ', s.studentID, ', Year: ', s.year)
        WHEN u.role = 'Student' THEN '❌ MISSING student record - THIS IS THE PROBLEM!'
        ELSE '⚪ Not a student role'
    END AS Result
FROM users u
LEFT JOIN students s ON u.userID = s.userID
ORDER BY u.userID
LIMIT 0, 25;

-- TEST 3: Count available rooms
SELECT 
    '3. Available Rooms' as Test,
    CONCAT('✅ ', COUNT(*), ' rooms available') as Result
FROM rooms 
WHERE status = 'Available' AND occupancy < capacity;

-- TEST 4: Check for any existing booking requests
SELECT 
    '4. Booking Requests' as Test,
    CONCAT(COUNT(*), ' booking requests exist') as Result
FROM booking_requests;

-- ========================================
-- IF YOU SEE "MISSING student record" ABOVE:
-- Copy the email from Test 2, then run this:
-- ========================================
/*
INSERT INTO students (userID, name, year, department, phoneNumber, guardianContact)
SELECT 
    userID, 
    'Student Name',        -- CHANGE THIS
    'First',               -- CHANGE THIS to: First, Second, Third, or Final
    'Computer Science',    -- CHANGE THIS
    '1234567890',          -- CHANGE THIS
    '0987654321'           -- CHANGE THIS
FROM users 
WHERE email = 'your-student-email@example.com'  -- CHANGE THIS TO YOUR EMAIL
AND role = 'Student'
AND NOT EXISTS (SELECT 1 FROM students WHERE students.userID = users.userID);

-- Then logout and login again!
*/
