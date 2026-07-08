# SYSTEM ARCHITECTURE DIAGRAMS

Visual representation of the Hostel Management System architecture.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER LAYER                          │
│                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐        │
│  │ Student  │      │  Warden  │      │  Admin   │        │
│  │ Browser  │      │ Browser  │      │ Browser  │        │
│  └────┬─────┘      └────┬─────┘      └────┬─────┘        │
└───────┼──────────────────┼──────────────────┼─────────────┘
        │                  │                  │
        │    HTTP/HTTPS (Port 3000)          │
        │                  │                  │
┌───────▼──────────────────▼──────────────────▼─────────────┐
│                   FRONTEND LAYER                            │
│                   React Application                         │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  React Router (Client-side routing)                │   │
│  │  - /login                                          │   │
│  │  - /register                                       │   │
│  │  - /student/dashboard                             │   │
│  │  - /admin/dashboard                               │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Auth Context (Global State)                       │   │
│  │  - User authentication state                       │   │
│  │  - Login/Logout functions                         │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  API Service (Axios with interceptors)            │   │
│  │  - Automatic JWT token attachment                  │   │
│  │  - Error handling                                  │   │
│  │  - Auto-logout on 401                             │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
        REST API (Port 5000) - JSON over HTTP
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   BACKEND LAYER                              │
│                   Node.js + Express.js                       │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Middleware Stack                                  │   │
│  │  1. CORS (Cross-origin requests)                  │   │
│  │  2. Body Parser (JSON parsing)                    │   │
│  │  3. JWT Verification (verifyJWT)                  │   │
│  │  4. Role Check (checkRole/checkPermission)        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Route Handlers                                    │   │
│  │  - /api/auth/* (Authentication)                   │   │
│  │  - /api/rooms/* (Room management)                 │   │
│  │  - /api/allocations/* (Allocation)                │   │
│  │  - /api/admin/* (Admin dashboard)                 │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Controllers (Business Logic)                      │   │
│  │  - authController.js                              │   │
│  │  - roomController.js                              │   │
│  │  - allocationController.js                        │   │
│  │  - adminController.js                             │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Utilities                                         │   │
│  │  - validators.js (Input validation)               │   │
│  │  - tokenManager.js (JWT operations)               │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
           mysql2 Driver (Connection Pool)
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   DATABASE LAYER                             │
│                   MySQL (XAMPP - Port 3306)                  │
│                                                             │
│  Tables:                                                    │
│  ┌──────────────┬──────────────────┬─────────────────┐    │
│  │ users        │ students         │ rooms           │    │
│  ├──────────────┼──────────────────┼─────────────────┤    │
│  │ room_        │ role_            │ password_       │    │
│  │ allocations  │ permissions      │ reset_tokens    │    │
│  ├──────────────┼──────────────────┼─────────────────┤    │
│  │ unauthorized_│ allocation_      │                 │    │
│  │ access_logs  │ logs             │                 │    │
│  └──────────────┴──────────────────┴─────────────────┘    │
│                                                             │
│  Views, Procedures, Triggers                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Flow

```
┌─────────┐                                    ┌─────────┐
│ User    │                                    │ Backend │
│ Browser │                                    │ Server  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. POST /api/auth/login                    │
     │     { email, password }                     │
     ├────────────────────────────────────────────►│
     │                                              │
     │                                              │  2. Query users table
     │                                              ├──────────┐
     │                                              │          │
     │                                              │◄─────────┘
     │                                              │
     │                                              │  3. bcrypt.compare()
     │                                              ├──────────┐
     │                                              │          │
     │                                              │◄─────────┘
     │                                              │
     │                                              │  4. Generate JWT token
     │                                              ├──────────┐
     │                                              │          │
     │                                              │◄─────────┘
     │                                              │
     │  5. Return { success, token, user }         │
     │◄────────────────────────────────────────────┤
     │                                              │
     │  6. Store token in localStorage              │
     ├──────────┐                                   │
     │          │                                   │
     │◄─────────┘                                   │
     │                                              │
     │  7. All future requests include token       │
     │     Authorization: Bearer <token>           │
     ├────────────────────────────────────────────►│
     │                                              │
     │                                              │  8. JWT verification
     │                                              ├──────────┐
     │                                              │          │
     │                                              │◄─────────┘
     │                                              │
     │  9. Response with data                      │
     │◄────────────────────────────────────────────┤
     │                                              │
```

---

## 3. Room Allocation Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ Student │                    │ Backend │                    │ MySQL   │
│ Browser │                    │ Server  │                    │ Database│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ 1. GET /allocations/         │                              │
     │    available-rooms           │                              │
     ├────────────────────────────►│                              │
     │                              │                              │
     │                              │ 2. Get student year          │
     │                              │    from userID               │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │ 3. Filter rooms by year      │
     │                              │    Final → Single only       │
     │                              │    Third → Double only       │
     │                              │◄─────────────────────────────┤
     │                              │                              │
     │ 4. Return filtered rooms     │                              │
     │◄────────────────────────────┤                              │
     │                              │                              │
     │ 5. Display room grid         │                              │
     │    (Green/Red boxes)         │                              │
     ├──────────┐                   │                              │
     │          │                   │                              │
     │◄─────────┘                   │                              │
     │                              │                              │
     │ 6. Click room                │                              │
     │    Select roomID             │                              │
     ├──────────┐                   │                              │
     │          │                   │                              │
     │◄─────────┘                   │                              │
     │                              │                              │
     │ 7. POST /allocations/        │                              │
     │    allocate {roomID}         │                              │
     ├────────────────────────────►│                              │
     │                              │                              │
     │                              │ 8. BEGIN TRANSACTION         │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │ 9. SELECT room FOR UPDATE    │
     │                              │    (Row lock)                │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │ 10. Validate:                │
     │                              │     - Room available?        │
     │                              │     - Year matches type?     │
     │                              │     - No existing alloc?     │
     │                              ├──────────┐                   │
     │                              │          │                   │
     │                              │◄─────────┘                   │
     │                              │                              │
     │                              │ 11. INSERT allocation        │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │ 12. UPDATE room occupancy    │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │ 13. UPDATE room status       │
     │                              │     (if full → Occupied)     │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │ 14. COMMIT TRANSACTION       │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │ 15. Log processing time      │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │ 16. Success message          │                              │
     │◄────────────────────────────┤                              │
     │                              │                              │
     │ 17. Show allocation          │                              │
     │     in dashboard             │                              │
     ├──────────┐                   │                              │
     │          │                   │                              │
     │◄─────────┘                   │                              │
```

---

## 4. Role-Based Access Control (RBAC) Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ User    │                    │ Backend │                    │ MySQL   │
│ Browser │                    │ Server  │                    │ Database│
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │ 1. Request to protected      │                              │
     │    endpoint with JWT         │                              │
     ├────────────────────────────►│                              │
     │                              │                              │
     │                              │ 2. verifyJWT middleware      │
     │                              ├──────────┐                   │
     │                              │          │                   │
     │                              │◄─────────┘                   │
     │                              │                              │
     │                              │ 3. Extract userID & role     │
     │                              │    from JWT payload          │
     │                              ├──────────┐                   │
     │                              │          │                   │
     │                              │◄─────────┘                   │
     │                              │                              │
     │                              │ 4. checkRole middleware      │
     │                              ├──────────┐                   │
     │                              │          │                   │
     │                              │◄─────────┘                   │
     │                              │                              │
     │                              │ 5. Check if role allowed     │
     │                              │    for this endpoint?        │
     │                              ├──────────┐                   │
     │                              │  YES / NO│                   │
     │                              │◄─────────┘                   │
     │                              │                              │
     │                              │ If NO:                       │
     │                              │ 6. Log unauthorized attempt  │
     │                              ├─────────────────────────────►│
     │                              │ INSERT INTO                  │
     │                              │ unauthorized_access_logs     │
     │                              │                              │
     │ 7. 403 Forbidden             │                              │
     │◄────────────────────────────┤                              │
     │                              │                              │
     │                              │ If YES:                      │
     │                              │ 8. Proceed to controller     │
     │                              ├──────────┐                   │
     │                              │          │                   │
     │                              │◄─────────┘                   │
     │                              │                              │
     │ 9. 200 OK + Data             │                              │
     │◄────────────────────────────┤                              │
```

---

## 5. Database Schema Relationships

```
┌──────────────────┐
│     users        │
│──────────────────│
│ PK: userID       │
│     email        │
│     hashedPass   │
│     role         │◄──────────────┐
│     hostelID     │               │
└────────┬─────────┘               │
         │                         │
         │ 1:1                     │
         │                         │
┌────────▼─────────┐               │
│    students      │               │
│──────────────────│               │
│ PK: studentID    │               │
│ FK: userID       │               │
│     name         │               │
│     year         │               │
│     department   │               │
└────────┬─────────┘               │
         │                         │
         │ 1:N                     │
         │                         │
┌────────▼──────────────────┐      │
│   room_allocations        │      │
│───────────────────────────│      │
│ PK: allocationID          │      │
│ FK: studentID             │      │
│ FK: roomID                │◄─────┤
│ FK: allocatedBy (userID)  │      │
│     allocatedDate         │      │
│     releaseDate           │      │
│     status                │      │
└────────┬──────────────────┘      │
         │                         │
         │ N:1                     │
         │                         │
┌────────▼─────────┐               │
│     rooms        │               │
│──────────────────│               │
│ PK: roomID       │               │
│     roomNumber   │               │
│     type         │               │
│     capacity     │               │
│     occupancy    │               │
│     status       │               │
│     facilities   │               │
└──────────────────┘               │
                                   │
┌──────────────────────────┐       │
│   role_permissions       │       │
│──────────────────────────│       │
│ PK: permissionID         │       │
│     role                 │───────┘
│     resource             │   (Lookup)
│     action               │
└──────────────────────────┘

┌──────────────────────────┐
│ password_reset_tokens    │
│──────────────────────────│
│ PK: tokenID              │
│ FK: userID               │───────┐
│     token                │       │
│     expiresAt            │       │ N:1
│     used                 │       │
└──────────────────────────┘       │
                                   │
                            ┌──────▼─────┐
                            │   users    │
                            │ (shown     │
                            │  above)    │
                            └────────────┘

┌──────────────────────────┐
│ unauthorized_access_logs │
│──────────────────────────│
│ PK: logID                │
│ FK: userID               │───────┐
│     endpoint             │       │
│     ipAddress            │       │ N:1
│     attemptTime          │       │
│     reason               │       │
└──────────────────────────┘       │
                                   │
                            ┌──────▼─────┐
                            │   users    │
                            └────────────┘

┌──────────────────────────┐
│   allocation_logs        │
│──────────────────────────│
│ PK: logID                │
│ FK: studentID            │───────┐
│ FK: roomID               │       │
│     processingTime       │       │
│     success              │       │ N:1
│     message              │       │
│     timestamp            │       │
└──────────────────────────┘       │
                                   │
                          ┌────────▼───────┐
                          │   students     │
                          └────────────────┘
```

---

## 6. Frontend Component Tree

```
App.js
│
├── AuthProvider (Context)
│   ├── user state
│   ├── login()
│   ├── register()
│   └── logout()
│
└── BrowserRouter
    │
    ├── Route: /login
    │   └── Login.js
    │       ├── Form (email, password)
    │       └── useAuth hook
    │
    ├── Route: /register
    │   └── Register.js
    │       ├── Form (email, password, role, name, year...)
    │       └── useAuth hook
    │
    ├── Route: /student/dashboard
    │   └── ProtectedRoute (allowedRoles: ['Student'])
    │       └── StudentDashboard.js
    │           ├── Navbar
    │           ├── Current Allocation Card
    │           ├── Room Selection UI
    │           │   └── Room Grid
    │           │       ├── Room Box (Green)
    │           │       ├── Room Box (Red)
    │           │       └── Room Box (Blue - Selected)
    │           └── useEffect (fetch rooms, allocation)
    │
    ├── Route: /student/history
    │   └── ProtectedRoute (allowedRoles: ['Student'])
    │       └── AllocationHistory.js
    │           ├── Navbar
    │           ├── Table
    │           └── useEffect (fetch history)
    │
    ├── Route: /admin/dashboard
    │   └── ProtectedRoute (allowedRoles: ['Admin', 'Warden'])
    │       └── AdminDashboard.js
    │           ├── Navbar
    │           ├── Tab Navigation
    │           ├── Overview Tab
    │           │   ├── Statistics Grid
    │           │   ├── Allocation by Year Table
    │           │   └── Recent Allocations Table
    │           ├── Rooms Tab
    │           │   └── All Rooms Table
    │           ├── Allocations Tab
    │           │   └── AllocationsList (inline component)
    │           │       └── Table with filters
    │           ├── Students Tab
    │           │   └── StudentsList (inline component)
    │           │       └── Table with filters
    │           └── useEffect (fetch all data)
    │
    ├── Route: /unauthorized
    │   └── 403 Error Page
    │
    └── Route: *
        └── 404 Not Found Page
```

---

## 7. API Request/Response Flow

```
FRONTEND                 MIDDLEWARE CHAIN              CONTROLLER
                                
Request                                                   
  ↓                                                      
[Axios]                                                  
  ↓                                                      
API Service                                              
(Add JWT token)                                          
  ↓                                                      
HTTP POST/GET                                            
  ↓                                                      
────────────────────►  [CORS]                          
                         ↓                               
                       [Body Parser]                     
                         ↓                               
                       [verifyJWT]                       
                       - Extract token                   
                       - Verify JWT                      
                       - Attach user to req              
                         ↓                               
                       [checkRole]                       
                       - Check user.role                 
                       - Allow/Deny                      
                       - Log if denied                   
                         ↓                               
                    ───────────────────►  [Controller]
                                              ↓
                                          Validate Input
                                              ↓
                                          Query Database
                                              ↓
                                          Process Logic
                                              ↓
                                          Format Response
                                              ↓
Response  ◄──────────────────────────────────┘          
  ↓                                                      
[Axios Interceptor]                                      
- Handle errors                                          
- Auto-logout on 401                                     
  ↓                                                      
Update UI State                                          
  ↓                                                      
Render Component                                         
```

---

## 8. Year-Based Room Allocation Logic

```
┌─────────────────────────────────────────┐
│ Student Year: Final                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Filter Available Rooms                   │
│                                          │
│ SELECT * FROM rooms                      │
│ WHERE type = 'Single'                    │
│   AND status = 'Available'               │
│   AND occupancy < capacity               │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Display Single Rooms Only                │
│                                          │
│ [A101] [A102] [A201] [A202]             │
│ (Green boxes - clickable)                │
└──────────────┬───────────────────────────┘
               │
        User clicks A101
               │
               ▼
┌──────────────────────────────────────────┐
│ Validate Eligibility                     │
│                                          │
│ IF year == 'Final' AND type == 'Single' │
│   → ALLOW                                │
│ ELSE                                     │
│   → DENY with message                    │
└──────────────┬───────────────────────────┘
               │
            ALLOW
               │
               ▼
┌──────────────────────────────────────────┐
│ Transaction BEGIN                        │
│                                          │
│ 1. SELECT room FOR UPDATE (lock)         │
│ 2. Check still available                 │
│ 3. INSERT allocation                     │
│ 4. UPDATE room occupancy + 1             │
│ 5. UPDATE room status if full            │
│ 6. COMMIT                                │
│                                          │
│ IF any error:                            │
│   → ROLLBACK                             │
└──────────────┬───────────────────────────┘
               │
            SUCCESS
               │
               ▼
┌──────────────────────────────────────────┐
│ Room A101 allocated to student           │
│ Processing time: 45ms                    │
│ Logged in allocation_logs                │
└──────────────────────────────────────────┘

═══════════════════════════════════════════

┌─────────────────────────────────────────┐
│ Student Year: Third                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Filter Available Rooms                   │
│                                          │
│ SELECT * FROM rooms                      │
│ WHERE type = 'Double'                    │
│   AND status = 'Available'               │
│   AND occupancy < capacity               │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Display Double Rooms Only                │
│                                          │
│ [A103] [A104] [A203] [A204]             │
│ (Green boxes - clickable)                │
└──────────────────────────────────────────┘
```

---

**End of Architecture Diagrams**

These diagrams provide a visual understanding of:
- System layers and communication
- Authentication flow
- Allocation process
- RBAC implementation
- Database relationships
- Component hierarchy
- Request/response flow
- Year-based allocation logic
