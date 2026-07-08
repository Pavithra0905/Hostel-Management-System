# Hostel Management System - Installation Guide

## Quick Start Guide

Follow these steps to set up and run the Hostel Management System on your local machine.

---

## Prerequisites

1. **Node.js** (v14+): https://nodejs.org/
2. **XAMPP**: https://www.apachefriends.org/
3. **Code Editor**: VS Code recommended

---

## Installation Steps

### 1. Database Setup

#### Start XAMPP
1. Open **XAMPP Control Panel**
2. Click **Start** for **Apache** and **MySQL**
3. Ensure MySQL runs on port 3306

#### Create Database
1. Open browser: **http://localhost/phpmyadmin**
2. Click **"SQL"** tab
3. Open file: `backend/models/db.sql`
4. Copy entire content and paste in SQL editor
5. Click **"Go"**

✅ Database `hostel_management` created with:
- All tables
- Sample rooms
- Role permissions
- Views and procedures

---

### 2. Backend Setup

#### Navigate to Backend Folder
```bash
cd d:\selab\hostel-management-system\backend
```

#### Install Dependencies
```bash
npm install
```

This installs:
- express
- mysql2
- bcrypt
- jsonwebtoken
- dotenv
- cors
- express-validator
- nodemailer

#### Configure Environment
1. Open `backend/.env`
2. Verify settings:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=hostel_management
DB_PORT=3306
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=24h
```

#### Start Backend Server
```bash
npm start
```

Or for auto-restart during development:
```bash
npm run dev
```

✅ Backend running on: **http://localhost:5000**

Expected output:
```
========================================
🏨 HOSTEL MANAGEMENT SYSTEM SERVER
========================================
🚀 Server running on port 5000
✅ MySQL Database connected successfully
```

---

### 3. Frontend Setup

#### Open New Terminal
Navigate to frontend folder:
```bash
cd d:\selab\hostel-management-system\frontend
```

#### Install Dependencies
```bash
npm install
```

This installs:
- react
- react-dom
- react-router-dom
- axios
- react-scripts

#### Start Frontend Server
```bash
npm start
```

✅ Frontend running on: **http://localhost:3000**

Browser will automatically open to login page.

---

## First-Time Usage

### Register Admin/Warden
1. Open **http://localhost:3000**
2. Click **"Register here"**
3. Fill form:
   - Email: admin@test.com
   - Password: Admin@123
   - Role: Admin
4. Click **Register**
5. Redirected to Admin Dashboard

### Register Student
1. Logout from admin
2. Click **"Register here"**
3. Fill form:
   - Email: student@test.com
   - Password: Student@123
   - Role: Student
   - Name: John Doe
   - Year: Final
   - Department: Computer Science
4. Click **Register**
5. Redirected to Student Dashboard

### Test Room Allocation
1. Login as Final Year student
2. See available Single rooms (green boxes)
3. Click a green box
4. Review room details
5. Click **"Confirm Allocation"**
6. Allocation successful!

---

## Folder Structure After Installation

```
hostel-management-system/
│
├── backend/
│   ├── node_modules/        [Created after npm install]
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── .env
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── node_modules/        [Created after npm install]
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
│
└── README.md
```

---

## Verification Checklist

- [ ] XAMPP MySQL running
- [ ] Database `hostel_management` created
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 3000
- [ ] Can register new users
- [ ] Can login successfully
- [ ] Student can view available rooms
- [ ] Student can allocate room
- [ ] Admin can view dashboard

---

## Common Commands

### Backend
```bash
# Install dependencies
npm install

# Start server
npm start

# Start with auto-restart
npm run dev
```

### Frontend
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

---

## Stopping the Application

1. **Frontend**: Press `Ctrl + C` in frontend terminal
2. **Backend**: Press `Ctrl + C` in backend terminal
3. **XAMPP**: Stop MySQL and Apache in XAMPP Control Panel

---

## Next Steps

1. ✅ Complete installation
2. ✅ Test basic functionality
3. 📖 Read full README.md
4. 🎨 Customize as needed
5. 🚀 Deploy (optional)

---

## Need Help?

- Check **README.md** for detailed documentation
- Review **Troubleshooting** section
- Check browser console (F12) for errors
- Check terminal for backend errors

---

**Installation Complete! 🎉**

Start building amazing features!
