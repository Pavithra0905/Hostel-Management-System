# Hostel Management System

A complete full-stack web application for managing hostel room allocations with priority-based allocation, role-based access control, and comprehensive reporting features.

## 🎓 Final Year Software Engineering Lab Project

---

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [System Architecture](#system-architecture)
- [User Roles](#user-roles)
- [Room Allocation Rules](#room-allocation-rules)
- [API Documentation](#api-documentation)
- [Screenshots](#screenshots)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Module 1: User Authentication & Access Management

- **User Registration & Login**
  - Email format validation
  - Password strength validation (min 8 chars, 1 digit, 1 special character)
  - Role-based registration (Student, Warden, Admin)
  - Password hashing using bcrypt
  - JWT token generation and verification

- **Role-Based Access Control (RBAC)**
  - Three roles: Student, Warden, Admin
  - Permission mapping stored in database
  - API endpoint protection by role
  - Unauthorized access logging with timestamp, userID, endpoint, and IP address

- **Password Recovery & Session Management**
  - Token-based password reset
  - Email notification support
  - Session expiration handling
  - Logout functionality

### Module 2: Priority-Based Room Allocation

- **Year-Based Allocation Rules**
  - Final Year students → Single rooms ONLY
  - Third Year students → Double rooms ONLY
  - Second/First Year → Remaining available rooms
  - No CGPA, disability, or distance-based scoring

- **Room Inventory Management**
  - Room types: Single and Double
  - Real-time availability tracking
  - Auto-update room status on allocation/cancellation
  - Occupancy management

- **Allocation Engine**
  - Transaction-based room locking to prevent double booking
  - Automatic eligibility checking based on student year
  - Conflict handling with alternative room suggestions
  - Performance logging (allocation processing time)

- **Reports & Analytics**
  - Total, available, and occupied rooms
  - Allocation count by academic year
  - Unauthorized access logs
  - Allocation performance metrics

### Frontend Features

- **Authentication Pages**
  - Login page
  - Registration page with role-based fields

- **Student Dashboard**
  - Visual room booking grid (Green=Available, Red=Occupied, Blue=Selected)
  - Current allocation display
  - Allocation history
  - Cancel allocation

- **Admin/Warden Dashboard**
  - Room statistics overview
  - All rooms list
  - All allocations list
  - All students list with allocation status
  - Allocation by year report

---

## 🛠 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** (via XAMPP) - Database
- **mysql2** - MySQL driver for Node.js
- **bcrypt** - Password hashing
- **jsonwebtoken (JWT)** - Authentication tokens
- **dotenv** - Environment configuration
- **cors** - Cross-origin resource sharing
- **express-validator** - Input validation

### Frontend
- **React 18** - UI library
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Styling

---

## 📁 Project Structure

```
hostel-management-system/
│
├── backend/
│   ├── config/
│   │   └── db.js                    # Database connection
│   ├── controllers/
│   │   ├── authController.js        # Authentication logic
│   │   ├── roomController.js        # Room CRUD operations
│   │   ├── allocationController.js  # Room allocation logic
│   │   └── adminController.js       # Admin reports & analytics
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   └── roleCheck.js             # RBAC middleware
│   ├── models/
│   │   └── db.sql                   # Database schema
│   ├── routes/
│   │   ├── auth.js                  # Auth routes
│   │   ├── rooms.js                 # Room routes
│   │   ├── allocation.js            # Allocation routes
│   │   └── admin.js                 # Admin routes
│   ├── utils/
│   │   ├── validators.js            # Input validation functions
│   │   └── tokenManager.js          # JWT token utilities
│   ├── .env                         # Environment variables
│   ├── package.json
│   └── server.js                    # Entry point
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.js    # Route protection
│   │   ├── context/
│   │   │   └── AuthContext.js       # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.js             # Login page
│   │   │   ├── Register.js          # Registration page
│   │   │   ├── StudentDashboard.js  # Student dashboard
│   │   │   ├── AdminDashboard.js    # Admin/Warden dashboard
│   │   │   └── AllocationHistory.js # Allocation history
│   │   ├── services/
│   │   │   └── api.js               # API service layer
│   │   ├── App.js                   # Main app component
│   │   ├── App.css                  # Global styles
│   │   └── index.js                 # React entry point
│   └── package.json
│
└── README.md
```

---

## 📦 Prerequisites

Before installation, ensure you have:

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/

2. **XAMPP** (for MySQL database)
   - Download from: https://www.apachefriends.org/

3. **Git** (optional, for cloning)
   - Download from: https://git-scm.com/

4. **Code Editor** (VS Code recommended)
   - Download from: https://code.visualstudio.com/

---

## 🚀 Installation

### Step 1: Clone or Extract Project

If you have the project as a folder, navigate to it. Otherwise:

```bash
cd d:\selab\hostel-management-system
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

This will install:
- express
- mysql2
- bcrypt
- jsonwebtoken
- dotenv
- cors
- express-validator
- nodemailer
- nodemon (dev dependency)

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

This will install:
- react
- react-dom
- react-router-dom
- axios
- react-scripts

---

## 🗄 Database Setup

### Step 1: Start XAMPP

1. Open **XAMPP Control Panel**
2. Start **Apache** and **MySQL** modules
3. Ensure MySQL is running on port **3306**

### Step 2: Create Database

1. Open browser and go to: **http://localhost/phpmyadmin**
2. Click on **"SQL"** tab
3. Open the file: `backend/models/db.sql`
4. Copy the **entire SQL script**
5. Paste it into phpMyAdmin SQL editor
6. Click **"Go"** to execute

This will:
- Create database `hostel_management`
- Create all required tables
- Insert role permissions
- Insert sample rooms
- Create sample admin and warden users

### Step 3: Configure Environment Variables

1. Navigate to `backend/.env` file
2. Update database credentials if needed:

```env
# Database Configuration (XAMPP MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=hostel_management
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=24h
```

⚠️ **Important**: Change `JWT_SECRET` to a strong random string in production!

---

## ▶️ Running the Application

### Step 1: Start Backend Server

Open terminal in `backend` folder:

```bash
cd backend
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

Backend will run on: **http://localhost:5000**

You should see:
```
========================================
🏨 HOSTEL MANAGEMENT SYSTEM SERVER
========================================
🚀 Server running on port 5000
📍 API URL: http://localhost:5000/api
🌍 Environment: development
========================================
✅ MySQL Database connected successfully
```

### Step 2: Start Frontend Server

Open **new terminal** in `frontend` folder:

```bash
cd frontend
npm start
```

Frontend will run on: **http://localhost:3000**

Browser should automatically open. If not, navigate to: **http://localhost:3000**

---

## 🏗 System Architecture

```
┌─────────────────┐
│  React Frontend │ (Port 3000)
│  - Login/Register
│  - Dashboards
│  - Room Booking UI
└────────┬────────┘
         │ HTTP/HTTPS
         │ (Axios)
         ▼
┌─────────────────┐
│  Express Backend│ (Port 5000)
│  - JWT Auth
│  - RBAC Middleware
│  - Controllers
│  - Routes
└────────┬────────┘
         │ mysql2
         ▼
┌─────────────────┐
│  MySQL Database │ (Port 3306)
│  - Users
│  - Students
│  - Rooms
│  - Allocations
│  - Logs
└─────────────────┘
```

---

## 👥 User Roles

### 1. Student
**Permissions:**
- View available rooms (filtered by year)
- Request room allocation
- View own allocation history
- Cancel own allocation

**Year-based Room Eligibility:**
- Final Year → Single rooms only
- Third Year → Double rooms only
- First/Second Year → Any available rooms

### 2. Warden
**Permissions:**
- View all rooms
- View all allocations
- View all students
- Update room status
- View reports

### 3. Admin
**Permissions:**
- All Warden permissions
- Create/Update/Delete rooms
- Create users
- View unauthorized access logs
- View allocation performance logs
- Full system access

---

## 🎯 Room Allocation Rules

### Priority Order (Year-Based Only)

1. **Final Year Students** (Highest Priority)
   - Eligible for: Single rooms ONLY
   - If no single rooms available: Show message "No rooms available for your year category"

2. **Third Year Students**
   - Eligible for: Double rooms ONLY
   - If no double rooms available: Show message "No rooms available for your year category"

3. **Second Year Students**
   - Eligible for: Any available rooms

4. **First Year Students**
   - Eligible for: Any available rooms

### Allocation Process

1. Student views available rooms (auto-filtered by year)
2. Student clicks on green room box
3. Room details displayed
4. Student confirms allocation
5. System:
   - Locks room using MySQL transaction (FOR UPDATE)
   - Validates eligibility (year + room type)
   - Creates allocation record
   - Updates room occupancy
   - Auto-updates room status if fully occupied
   - Logs processing time
6. Student sees success message

### Conflict Prevention

- **Row-level locking** prevents double booking
- **Transaction rollback** on any error
- **Eligibility check** before allocation
- **Alternative room suggestions** on failure

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### POST /auth/register
Register new user

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "Student@123",
  "role": "Student",
  "name": "John Doe",
  "year": "Final",
  "department": "Computer Science",
  "phoneNumber": "1234567890",
  "guardianContact": "0987654321"
}
```

#### POST /auth/login
User login

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "Student@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userID": 1,
    "email": "student@example.com",
    "role": "Student",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /auth/forgot-password
Request password reset

#### POST /auth/reset-password
Reset password with token

#### GET /auth/profile
Get current user profile (Protected)

**Headers:**
```
Authorization: Bearer <token>
```

### Room Allocation Endpoints

#### GET /allocations/available-rooms
Get available rooms for logged-in student (filtered by year)

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /allocations/allocate
Allocate room to student

**Request Body:**
```json
{
  "roomID": 5
}
```

#### GET /allocations/my-allocation
Get current active allocation

#### GET /allocations/my-history
Get allocation history

#### DELETE /allocations/:allocationID/cancel
Cancel allocation

### Admin Endpoints

#### GET /admin/dashboard
Get dashboard statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "roomStatistics": {
      "totalRooms": 14,
      "availableRooms": 12,
      "occupiedRooms": 2,
      "singleRooms": 6,
      "doubleRooms": 8
    },
    "allocationByYear": [...],
    "studentCount": 10,
    "recentAllocations": [...]
  }
}
```

#### GET /admin/allocations
Get all allocations (with filters)

#### GET /admin/students
Get all students

#### GET /admin/unauthorized-logs
Get unauthorized access logs

---

## 🖼 Screenshots

### Login Page
- Email and password fields
- Link to registration page

### Student Registration
- Email, password, name, year, department
- Password strength validation
- Role selection

### Student Dashboard
- Current allocation (if any)
- Room booking grid
  - Green boxes = Available
  - Red boxes = Occupied
  - Blue box = Selected
- Room details on selection
- Confirm allocation button

### Admin Dashboard
- Statistics cards (Total rooms, Available, Occupied, Students)
- Allocation by year table
- Recent allocations
- All rooms list
- All students list

---

## 🧪 Testing

### Test Accounts

After running database setup, you can use:

**Admin:**
- Email: admin@hostel.com
- Password: Admin@123 *(hash needs to be regenerated - see below)*

**Warden:**
- Email: warden@hostel.com
- Password: Warden@123 *(hash needs to be regenerated - see below)*

⚠️ **Note**: The default passwords in the SQL file are placeholder hashes. To use them:

1. Register a new admin/warden through the UI, OR
2. Generate proper bcrypt hashes and update the SQL file

### Testing Workflow

1. **Register as Student (Final Year)**
2. **Login**
3. **View available rooms** (should see only Single rooms)
4. **Select a room** (green box)
5. **Confirm allocation**
6. **Verify allocation shows in dashboard**
7. **Cancel allocation**
8. **Register another student (Third Year)**
9. **Login and verify only Double rooms shown**
10. **Register as Admin**
11. **Login to Admin dashboard**
12. **View all statistics and reports**

---

## 🔧 Troubleshooting

### Backend Issues

**Problem:** Database connection failed
**Solution:**
- Ensure XAMPP MySQL is running
- Check port 3306 is not blocked
- Verify credentials in `.env` file
- Check if database `hostel_management` exists

**Problem:** JWT verification error
**Solution:**
- Check `JWT_SECRET` is set in `.env`
- Clear browser localStorage
- Re-login to get fresh token

**Problem:** Port 5000 already in use
**Solution:**
- Change `PORT` in `.env` file
- Update `API_URL` in `frontend/src/services/api.js`

### Frontend Issues

**Problem:** Cannot connect to backend
**Solution:**
- Ensure backend is running on port 5000
- Check `API_URL` in `frontend/src/services/api.js`
- Disable browser CORS extensions

**Problem:** Login/Register not working
**Solution:**
- Open browser console (F12) for errors
- Check network tab for API responses
- Verify backend logs for errors

**Problem:** Room grid not showing
**Solution:**
- Check if student year is set in database
- Verify JWT token is valid
- Check if rooms exist in database

### Database Issues

**Problem:** Foreign key constraint errors
**Solution:**
- Drop database and re-run full SQL script
- Ensure tables are created in correct order

**Problem:** Duplicate entry errors
**Solution:**
- Check for existing records before insert
- Use unique email addresses for testing

---

## 📝 Development Notes

### Password Requirements
- Minimum 8 characters
- At least 1 digit (0-9)
- At least 1 special character (!@#$%^&*...)

### JWT Token Expiry
- Default: 24 hours
- Configurable in `.env` → `JWT_EXPIRE`

### Room Allocation Logic
- Allocation uses MySQL transactions for data consistency
- Row-level locking (`FOR UPDATE`) prevents race conditions
- Processing time is logged for performance monitoring

### Security Features
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens for stateless authentication
- Role-based middleware on all protected routes
- Unauthorized access attempts logged to database
- SQL injection prevented by parameterized queries

---

## 🎓 Educational Purpose

This project demonstrates:
- Full-stack web development
- RESTful API design
- JWT authentication
- Role-based access control
- Transaction management
- React component architecture
- State management
- Responsive UI design

---

## 📄 License

This project is created for educational purposes as part of a Final Year Software Engineering Lab project.

---

## 👨‍💻 Support

For issues or questions:
1. Check troubleshooting section
2. Verify all installation steps completed
3. Check console/terminal for error messages
4. Review API documentation

---

## 🎉 Acknowledgments

- Node.js and Express.js communities
- React documentation
- MySQL documentation
- Stack Overflow community

---

**Happy Coding! 🚀**
