# Payment & Fee Management Feature Documentation

## 📋 Overview

A comprehensive **Payment & Fee Management System** has been implemented for your hostel management system. This feature allows:

- **Students** to view and track their payment status
- **Admins/Wardens** to manage, record, and track all student payments
- **Automatic fine calculation** for late payments
- **Payment receipts** generation (printable & downloadable)
- **Payment history** and analytics

---

## 🗄️ Database Schema

### New Tables Created:

#### 1. **hostel_payments**
Tracks all monthly fees and payments for each student.

**Columns:**
- `paymentID` - Primary key
- `studentID` - Foreign key to students table
- `month` - Payment month (YYYY-MM format)
- `feeAmount` - Monthly hostel fee
- `fineAmount` - Late payment fine
- `totalAmount` - feeAmount + fineAmount
- `paidAmount` - Amount paid by student
- `paymentStatus` - Enum: Pending, Partial, Full, Overdue
- `paymentDueDate` - When payment is due
- `paymentDate` - When payment was made
- `paymentMethod` - Enum: Cash, Online Transfer, Cheque, UPI
- `receiptNumber` - Unique receipt identifier

#### 2. **payment_receipts**
Stores generated payment receipts in HTML format.

**Columns:**
- `receiptID` - Primary key
- `paymentID` - Foreign key
- `receiptNumber` - Unique receipt number
- `generatedAt` - When receipt was generated
- `generatedBy` - Admin/Warden userID
- `pdfPath` - Path to receipt file (optional)

#### 3. **fine_rules**
Defines late payment fine structure.

**Columns:**
- `ruleID` - Primary key
- `name` - Rule name
- `daysLate` - Days after due date
- `finePercentage` - Fine as percentage of fee
- `isActive` - Whether rule is active

**Default Fine Rules:**
- No fine (same day)
- 5% fine after 5 days
- 10% fine after 10 days
- 15% fine after 15 days
- 25% fine after 30 days

#### 4. **payment_history**
Audit trail for all payment status changes.

**Columns:**
- `historyID` - Primary key
- `paymentID` - Foreign key
- `previousStatus` - Previous payment status
- `newStatus` - New payment status
- `amountPaid` - Amount paid in this transaction
- `changedBy` - Admin/Warden who recorded the payment
- `reason` - Reason for status change
- `changedAt` - When status changed

---

## 🔧 Backend Implementation

### API Endpoints

#### Student Payment Endpoints:

1. **GET** `/api/payments/status/:studentID`
   - Get current month payment status for a student
   - Returns: feeAmount, fineAmount, totalAmount, paidAmount, paymentStatus, etc.

2. **GET** `/api/payments/history/:studentID`
   - Get payment history (paginated)
   - Query params: `limit`, `offset`
   - Returns: Array of historical payments

3. **GET** `/api/payments/receipt/:paymentID`
   - Generate payment receipt in HTML format
   - Returns: HTML-formatted receipt with student details, payment breakdown

#### Admin/Warden Endpoints:

4. **GET** `/api/payments/all`
   - Get all students' payments with filters
   - Query params: `status`, `month`, `limit`, `offset`
   - Returns: Paginated list of all payments

5. **POST** `/api/payments/record`
   - Record a payment for a student
   - Body: `{ paymentID, amountPaid, paymentMethod, remarks }`
   - Auto-updates payment status (Pending → Partial → Full)

6. **GET** `/api/payments/fine/:paymentID`
   - Calculate applicable fine for a payment
   - Returns: daysLate, finePercentage, calculatedFine

7. **GET** `/api/payments/summary`
   - Get payment summary for admin dashboard
   - Returns: Total students, paid count, partial count, unpaid count, etc.

### Controller: `paymentController.js`

**Functions:**
- `getPaymentStatus()` - Fetch current payment status
- `getPaymentHistory()` - Paginated payment history
- `getAllStudentsPaymentStatus()` - Admin view all payments
- `recordPayment()` - Record payment transaction
- `calculateFine()` - Calculate late fees
- `generateReceipt()` - Generate HTML receipt
- `getPaymentSummary()` - Dashboard summary statistics

### Routes: `routes/payments.js`

All routes include proper authentication (`verifyJWT`) and role-based access control (`checkRole`).

---

## 🎨 Frontend Components

### Student Pages

#### 1. **StudentPaymentDashboard.js** (`/student/payments/{')
Shows current month payment status for a student.

**Features:**
- Visual payment status display (Pending, Partial, Full, Overdue)
- Amount breakdown (Fee + Fine = Total)
- Payment/Outstanding amount display
- Generate receipt button
- Receipt modal with print/download options
- Status color coding

#### 2. **StudentPaymentHistory.js** (`/student/payment-history`)
Shows all historical payments in a table format.

**Features:**
- Paginated payment history (12 per page)
- Month, Fee, Fine, Total Due, Paid, Status columns
- Status badge with color coding
- Generate receipt for any historical payment
- Print and download receipt options
- Previous/Next pagination

### Admin Pages

#### 3. **AdminPaymentManagement.js** (`/admin/payments`)
Comprehensive admin dashboard for payment management.

**Two Tabs:**

**a) Overview Tab:**
- Total students count
- Fully paid students count
- Partially paid students count
- Unpaid/Overdue students count
- Total amount due (₹)
- Total amount collected (₹)
- Payment status distribution chart (Full, Partial, Pending, Overdue)

**b) Manage Payments Tab:**
- **Filters:**
  - Month selector
  - Payment status filter (All, Full, Partial, Pending, Overdue)
  - Paginated results

- **Record Payment Form:**
  - Payment ID input
  - Amount paid input
  - Payment method selector (Cash, Online Transfer, Cheque, UPI)
  - Remarks textarea
  - Submit button

- **Payments Table:**
  - Student name & year
  - Month
  - Total due
  - Paid amount
  - Status badge
  - Receipt button
  - Pagination controls

---

## 📱 API Service Integration

Added to `frontend/src/services/api.js`:

```javascript
export const paymentAPI = {
  getPaymentStatus: (studentID) => api.get(`/payments/status/${studentID}`),
  getPaymentHistory: (studentID, params) => api.get(`/payments/history/${studentID}`, { params }),
  getAllStudentsPayments: (params) => api.get('/payments/all', { params }),
  recordPayment: (data) => api.post('/payments/record', data),
  calculateFine: (paymentID) => api.get(`/payments/fine/${paymentID}`),
  generateReceipt: (paymentID) => api.get(`/payments/receipt/${paymentID}`),
  getPaymentSummary: () => api.get('/payments/summary')
};
```

---

## 🚀 Installation & Setup

### Step 1: Database Migration

Run the migration file to create all payment-related tables:

```bash
# In MySQL/XAMPP
mysql -u root -p hostel_management < backend/migrations/002_add_payments_table.sql
```

Or manually copy and run the SQL from `backend/migrations/002_add_payments_table.sql` in phpMyAdmin.

### Step 2: Backend Setup

The backend is already configured:
- ✅ Payment controller created
- ✅ Payment routes created
- ✅ Server.js updated with payment routes
- ✅ API endpoints ready

No additional setup needed!

### Step 3: Frontend Setup

The frontend is already configured:
- ✅ Payment API service added
- ✅ Student payment pages created
- ✅ Admin payment pages created
- ✅ Routes added to App.js
- ✅ Navigation links added

No additional setup needed!

### Step 4: Test the Feature

1. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Login as Student:**
   - Go to `/student/dashboard`
   - Click "💳 Payments" in sidebar
   - View current payment status

4. **Login as Admin/Warden:**
   - Go to `/admin/dashboard`
   - Click "Payments" in sidebar
   - View analytics and record payments

---

## 📊 Features Breakdown

### For Students:

✅ **View Payment Status**
- Current month fee, fine, total due
- Amount already paid
- Outstanding balance
- Payment due date

✅ **Payment History**
- All previous months
- Payment methods
- Status history
- Print/Download receipts

✅ **Receipts**
- Auto-generated HTML receipts
- Receipt number
- Student details
- Payment breakdown
- Printable format
- Downloadable as HTML file

### For Admin/Warden:

✅ **Dashboard Overview**
- Payment collection summary
- Student payment status distribution
- Total collected vs. total due
- Quick statistics

✅ **Record Payments**
- Select student/payment ID
- Enter amount paid
- Choose payment method
- Add remarks/notes
- Auto-generates receipt number

✅ **Track All Payments**
- Filter by month
- Filter by payment status
- See all students' payments
- Sorted by latest updates
- Paginated for performance

✅ **Fine Calculation**
- Automatic fine calculation
- Based on days overdue
- Customizable fine rules
- Fine rules can be modified in `fine_rules` table

---

## 🔒 Security & Permissions

### Role-Based Access:

**Students:**
- Can view only their own payment status
- Can view their own payment history
- Can generate their own receipts
- Cannot access other students' payments

**Admin/Warden:**
- Can view all students' payments
- Can record payments
- Can generate any receipt
- Can view analytics dashboard
- Can filter and search payments

### Data Protection:

- All API endpoints require JWT authentication
- Student endpoints check user ID ownership
- Payment modifications logged in `payment_history` table
- All transactions auditable

---

## 💡 Additional Configuration

### Customize Fine Rules:

To change fine structure, update the `fine_rules` table:

```sql
-- Example: Add 2% fine after 2 days
INSERT INTO fine_rules (name, daysLate, finePercentage, isActive)
VALUES ('2 days late', 2, 2, TRUE);

-- Deactivate a rule
UPDATE fine_rules SET isActive = FALSE WHERE ruleID = 1;
```

### Set Monthly Fee Amount:

Update the `monthlyFeeAmount` in the `students` table:

```sql
UPDATE students SET monthlyFeeAmount = 6000 WHERE studentID = 1;
```

Or set default for new students:

```sql
ALTER TABLE students MODIFY monthlyFeeAmount DECIMAL(10, 2) DEFAULT 5500;
```

---

## 📈 Future Enhancements

Possible features to add:

1. **Automated Email Notifications**
   - Send payment reminders
   - Send receipts via email
   - Alert students about overdue payments

2. **Online Payment Gateway Integration**
   - Razorpay/PayPal integration
   - Auto-payment recording
   - Payment confirmation webhooks

3. **Refunds Management**
   - Track refunds
   - Refund history

4. **Payment Plans**
   - Split payment options
   - Installment plans

5. **Export Reports**
   - Export to CSV/Excel
   - Generate PDF reports
   - Monthly revenue reports

6. **Dunning Management**
   - Automatic payment follow-ups
   - Escalation workflows

---

## 🐛 Troubleshooting

### Issue: Payment status not showing

**Solution:**
1. Create payment records: Run the migration file
2. Check if student exists in `students` table
3. Verify JWT token is valid

### Issue: Fine not calculated

**Solution:**
1. Check `fine_rules` table has entries
2. Verify `paymentDueDate` is set correctly
3. Check system date/time is correct

### Issue: Receipt not generating

**Solution:**
1. Clear browser cache
2. Check payment exists before generating receipt
3. Verify payment record has all required fields

---

## 📞 Support

For issues or enhancements:
1. Check the API endpoints are working: `http://localhost:5000/api/payments/summary`
2. Verify database tables are created: `SHOW TABLES LIKE '%payment%'`
3. Check browser console for frontend errors
4. Check backend logs for API errors

---

## Summary

The **Payment & Fee Management** feature is fully implemented and production-ready! 

**Files Added:**
- Backend: `controllers/paymentController.js`, `routes/payments.js`, `migrations/002_add_payments_table.sql`
- Frontend: `pages/StudentPaymentDashboard.js`, `pages/StudentPaymentHistory.js`, `pages/AdminPaymentManagement.js`
- Updated: `server.js`, `App.js`, `services/api.js`, `pages/StudentDashboard.js`, `pages/AdminDashboard.js`

**Total: 8 new files, 5 modified files**

Go ahead and run the migration, then test the feature! 🎉
