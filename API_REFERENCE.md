# API ENDPOINTS REFERENCE

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Description:** Register a new user in the system

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

**Response (Success):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userID": 5,
    "email": "student@example.com",
    "role": "Student",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. Login
**POST** `/auth/login`

**Description:** Authenticate user and get JWT token

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "Student@123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userID": 5,
    "email": "student@example.com",
    "role": "Student",
    "permissions": [...],
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Get Profile
**GET** `/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userID": 5,
    "email": "student@example.com",
    "role": "Student",
    "createdAt": "2024-02-25T10:00:00.000Z",
    "studentDetails": {
      "studentID": 3,
      "name": "John Doe",
      "year": "Final",
      "department": "Computer Science"
    }
  }
}
```

---

### 4. Logout
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 5. Forgot Password
**POST** `/auth/forgot-password`

**Request Body:**
```json
{
  "email": "student@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If email exists, password reset link has been sent"
}
```

---

### 6. Reset Password
**POST** `/auth/reset-password`

**Request Body:**
```json
{
  "token": "abc123def456...",
  "newPassword": "NewPassword@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful. Please login with new password."
}
```

---

## Room Allocation Endpoints (Student)

### 7. Get Available Rooms
**GET** `/allocations/available-rooms`

**Headers:**
```
Authorization: Bearer <token>
```

**Description:** Get rooms available for the logged-in student based on their year

**Response:**
```json
{
  "success": true,
  "message": "Found 6 available rooms for Final year students",
  "data": [
    {
      "roomID": 1,
      "roomNumber": "A101",
      "type": "Single",
      "capacity": 1,
      "occupancy": 0,
      "facilities": "Attached Bathroom, Study Table, Bed, Wardrobe, WiFi",
      "status": "Available",
      "floor": 1,
      "hostelBlock": "A"
    }
  ],
  "eligibility": {
    "year": "Final",
    "allowedRoomTypes": ["Single"]
  }
}
```

---

### 8. Allocate Room
**POST** `/allocations/allocate`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "roomID": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Room allocated successfully",
  "data": {
    "allocationID": 10,
    "roomNumber": "A101",
    "roomType": "Single",
    "allocatedDate": "2024-02-25T12:30:00.000Z",
    "processingTime": "45ms"
  }
}
```

**Response (Error - Wrong Room Type):**
```json
{
  "success": false,
  "message": "Final year students can only book Single rooms",
  "suggestion": "Please select a Single room"
}
```

---

### 9. Get Current Allocation
**GET** `/allocations/my-allocation`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allocationID": 10,
    "allocatedDate": "2024-02-25T12:30:00.000Z",
    "status": "Active",
    "roomID": 1,
    "roomNumber": "A101",
    "type": "Single",
    "hostelBlock": "A",
    "floor": 1,
    "facilities": "Attached Bathroom, Study Table, Bed, Wardrobe, WiFi"
  }
}
```

---

### 10. Get Allocation History
**GET** `/allocations/my-history`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "allocationID": 10,
      "allocatedDate": "2024-02-25T12:30:00.000Z",
      "releaseDate": null,
      "status": "Active",
      "roomNumber": "A101",
      "type": "Single",
      "hostelBlock": "A",
      "floor": 1,
      "facilities": "..."
    }
  ],
  "count": 1
}
```

---

### 11. Cancel Allocation
**DELETE** `/allocations/:allocationID/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Allocation cancelled successfully"
}
```

---

## Room Management Endpoints (Admin/Warden)

### 12. Get All Rooms
**GET** `/allocations/all-rooms`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters (Optional):**
- `status`: Available | Occupied | Maintenance
- `type`: Single | Double

**Example:** `/allocations/all-rooms?status=Available&type=Single`

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 14
}
```

---

### 13. Create Room
**POST** `/rooms`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin only

**Request Body:**
```json
{
  "roomNumber": "C101",
  "type": "Single",
  "capacity": 1,
  "facilities": "Attached Bathroom, AC, Study Table",
  "floor": 1,
  "hostelBlock": "C"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "roomID": 15,
    "roomNumber": "C101",
    "type": "Single",
    "capacity": 1
  }
}
```

---

### 14. Update Room
**PUT** `/rooms/:roomID`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin, Warden

**Request Body:**
```json
{
  "status": "Maintenance",
  "facilities": "Updated facilities"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Room updated successfully"
}
```

---

### 15. Delete Room
**DELETE** `/rooms/:roomID`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

---

## Admin Dashboard Endpoints

### 16. Get Dashboard Statistics
**GET** `/admin/dashboard`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin, Warden

**Response:**
```json
{
  "success": true,
  "data": {
    "roomStatistics": {
      "totalRooms": 14,
      "availableRooms": 10,
      "occupiedRooms": 3,
      "maintenanceRooms": 1,
      "singleRooms": 6,
      "doubleRooms": 8
    },
    "allocationByYear": [
      {
        "year": "Final",
        "totalAllocations": 5,
        "activeAllocations": 3
      }
    ],
    "studentCount": 25,
    "recentAllocations": [...]
  }
}
```

---

### 17. Get All Allocations
**GET** `/admin/allocations`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin, Warden

**Query Parameters (Optional):**
- `status`: Active | Cancelled | Completed
- `year`: First | Second | Third | Final

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 25
}
```

---

### 18. Get All Students
**GET** `/admin/students`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin, Warden

**Query Parameters (Optional):**
- `year`: First | Second | Third | Final

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "studentID": 1,
      "name": "John Doe",
      "year": "Final",
      "department": "Computer Science",
      "email": "john@example.com",
      "allocationStatus": "Allocated",
      "roomNumber": "A101"
    }
  ],
  "count": 25
}
```

---

### 19. Get Unauthorized Access Logs
**GET** `/admin/unauthorized-logs`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin only

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "logID": 1,
      "userID": 5,
      "email": "student@example.com",
      "role": "Student",
      "endpoint": "/api/admin/dashboard",
      "ipAddress": "127.0.0.1",
      "attemptTime": "2024-02-25T10:15:00.000Z",
      "reason": "Role Student not authorized for this endpoint"
    }
  ],
  "count": 10
}
```

---

### 20. Get Allocation Logs
**GET** `/admin/allocation-logs`

**Headers:**
```
Authorization: Bearer <token>
```

**Permissions:** Admin, Warden

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "logID": 1,
      "studentName": "John Doe",
      "year": "Final",
      "roomNumber": "A101",
      "processingTime": 45,
      "success": true,
      "message": "Room allocated successfully",
      "timestamp": "2024-02-25T12:30:00.000Z"
    }
  ],
  "count": 50,
  "averageProcessingTime": 52.3
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common Error Status Codes

- **400** - Bad Request (validation error)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **409** - Conflict (duplicate entry)
- **500** - Internal Server Error

---

## Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token obtained from `/auth/login` or `/auth/register` endpoints.

---

## Testing with Postman/Insomnia

1. **Login** to get token
2. **Copy token** from response
3. **Add header** to all protected requests:
   ```
   Authorization: Bearer <paste_token_here>
   ```
4. **Make requests** as needed

---

## Rate Limiting

Currently not implemented. Consider adding in production:
- Max 100 requests per 15 minutes per IP
- Max 10 login attempts per hour per IP

---

**End of API Documentation**
