-- FIX: Add student record for existing user account
-- Replace 'your-email@example.com' with your actual login email

-- Step 1: Check what users exist
SELECT userID, email, role FROM users WHERE role = 'Student';

-- Step 2: Insert student record (UPDATE the email and details below)
INSERT INTO students (userID, name, year, department, phoneNumber, guardianContact)
SELECT 
    userID, 
    'Your Name',           -- Change this
    'First',               -- Change to: First, Second, Third, or Final
    'Computer Science',    -- Change this
    '1234567890',         -- Change this
    '0987654321'          -- Change this
FROM users 
WHERE email = 'your-email@example.com'  -- Change to your actual email
AND NOT EXISTS (SELECT 1 FROM students WHERE students.userID = users.userID);

-- Step 3: Verify the student record was created
SELECT s.*, u.email 
FROM students s 
JOIN users u ON s.userID = u.userID;
