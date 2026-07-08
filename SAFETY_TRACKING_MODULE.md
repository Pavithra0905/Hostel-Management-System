# Safety Tracking Module (Module 4)

This document describes the Safety Tracking implementation added to this Hostel Management System.

## Technology

- Frontend: React
- Backend: Node.js + Express
- Database: MySQL (XAMPP)
- Map: Basic in-dashboard map visualization using normalized coordinate markers

## Database Schema

Run one of these files:

- Full schema (includes safety): `backend/models/db.sql`
- Safety-only schema: `backend/models/safety_module.sql`
- Migration file: `backend/migrations/003_add_safety_tracking.sql`

### New Tables

1. `safe_zones`
2. `location_logs`
3. `safety_violations`
4. `emergency_alerts`
5. `incident_reports`

## Backend APIs

Base URL: `http://localhost:5000/api`

### Task 1: Real-Time Location Monitoring

1. `POST /location/update`
- Body:
```json
{
  "studentID": 1,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "timestamp": "2026-03-30T10:40:00.000Z"
}
```
- Behavior:
  - Stores location in `location_logs`
  - Checks against active safe zone using Haversine distance
  - If outside safe zone, inserts record in `safety_violations`

2. `GET /location/all`
- Access: Admin/Warden
- Returns latest known location for each student with safe/unsafe status

### Task 2: Emergency & Safety Alerts

3. `POST /emergency`
- Body:
```json
{
  "studentID": 1,
  "message": "Emergency! Immediate assistance required.",
  "location": "12.9716,77.5946",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```
- Stores alert in `emergency_alerts`
- Simulates notification using console logs

4. `GET /emergency`
- Access: Admin/Warden
- Returns emergency alert list

5. `PUT /emergency/:id/resolve`
- Access: Admin/Warden
- Marks alert as resolved and writes `response_time_minutes`

6. Auto escalation
- Any `pending` alert older than 5 minutes becomes `escalated`
- Escalation runs before dashboard list/metric queries

7. `POST /incidents`
- Access: Admin/Warden
- Creates incident report in `incident_reports`

8. `GET /incidents/recent`
- Access: Admin/Warden
- Lists recent incident reports

### Task 3: Reporting & Analytics

9. `GET /reports/metrics`
- Returns:
  - total alerts
  - average response time
  - alerts per week

10. `GET /reports/high-risk-areas`
- Returns grouped violation hotspots by rounded coordinates

11. `GET /reports/trends?days=30`
- Returns day-wise incident trends

12. `GET /reports/export?type=alerts|incidents`
- Exports CSV for alerts or incidents

## Frontend Components

Created components:

1. `frontend/src/components/LocationTracker.jsx`
- Simulates mobile location update flow
- Uses browser geolocation if available

2. `frontend/src/components/PanicButton.jsx`
- Large red SOS button
- Sends emergency alert to backend

3. `frontend/src/components/SafetyDashboard.jsx`
- Admin/Warden dashboard with:
  - alert list
  - location status list
  - safety metrics
  - incident list
  - high-risk areas
  - trends
  - CSV export buttons
  - basic map markers

4. `frontend/src/components/SafetyTracking.css`
- Styling for all safety components

5. `frontend/src/pages/SafetyTrackingPage.js`
- Role-based page:
  - Student: `LocationTracker` + `PanicButton`
  - Admin/Warden: `SafetyDashboard`

## App Integration

- Backend route mounted in `backend/server.js`
- New backend route file: `backend/routes/safety.js`
- New backend controller: `backend/controllers/safetyController.js`
- Frontend API client updated: `frontend/src/services/api.js`
- Route added in app:
  - `/student/safety`
  - `/admin/safety`
- Navigation links added in student/admin dashboards

## Quick Demo Flow

1. Login as Student and open Safety Tracking.
2. Click **Share Live Location** to push GPS updates.
3. Click **PANIC / SOS** to create emergency alert.
4. Login as Admin/Warden and open Safety Tracking.
5. Monitor alerts, locations, incidents, metrics.
6. Resolve alert and observe response time updates.
7. Export CSV reports.
