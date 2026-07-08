/**
 * HOSTEL MANAGEMENT SYSTEM - MAIN SERVER FILE
 * Entry point for Node.js Express backend
 * Handles server initialization, middleware setup, and route mounting
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connection
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const allocationRoutes = require('./routes/allocation');
const adminRoutes = require('./routes/admin');
const complaintRoutes = require('./routes/complaints');
const paymentRoutes = require('./routes/payments');
const safetyRoutes = require('./routes/safety');
const fineRoutes = require('./routes/fine');
const leaveRoutes = require('./routes/leaves');

// Initialize Express app
const app = express();

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

// Enable CORS for frontend communication
app.use(cors({
  origin: 'http://localhost:3000', // React frontend URL
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Expose uploaded files (e.g., booking fee receipts)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ========================================
// API ROUTES
// ========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hostel Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount route handlers
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api', safetyRoutes);

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// 404 handler - Route not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========================================
// SERVER INITIALIZATION
// ========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('========================================');
  console.log('🏨 HOSTEL MANAGEMENT SYSTEM SERVER');
  console.log('========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log('========================================');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
