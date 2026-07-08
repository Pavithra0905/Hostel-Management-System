-- VERIFICATION SCRIPT
-- Run this in phpMyAdmin to verify your setup

USE hostel_management;

-- 1. Check if booking_requests table exists
SHOW TABLES LIKE 'booking_requests';

-- 2. Check student records
SELECT 
    s.studentID, 
    s.name, 
    s.year, 
    u.email, 
    u.role
FROM students s
JOIN users u ON s.userID = u.userID
ORDER BY s.studentID;

-- 3. Check if your user has a student record
-- Replace 'your-email@example.com' with your actual login email
SELECT 
    u.userID,
    u.email,
    u.role,
    s.studentID,
    s.name,
    s.year,
    CASE 
        WHEN s.studentID IS NULL THEN '❌ MISSING - Need to add student record'
        ELSE '✅ Student record exists'
    END as status
FROM users u
LEFT JOIN students s ON u.userID = s.userID
WHERE u.email = 'your-email@example.com';  -- CHANGE THIS TO YOUR EMAIL

-- 4. If student record is missing, run this INSERT
-- (Uncomment and update with your details)
/*
INSERT INTO students (userID, name, year, department, phoneNumber, guardianContact)
SELECT 
    userID, 
    'Your Full Name',      -- Change this
    'First',               -- Change to: First, Second, Third, or Final
    'Computer Science',    -- Change this
    '1234567890',          -- Change this
    '0987654321'           -- Change this
FROM users 
WHERE email = 'your-email@example.com'  -- CHANGE THIS
AND NOT EXISTS (SELECT 1 FROM students WHERE students.userID = users.userID);
*/

-- 5. Verify booking_requests table structure
DESCRIBE booking_requests;
