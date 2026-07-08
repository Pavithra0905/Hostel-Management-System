/**
 * API SERVICE
 * Handles all HTTP requests to backend API
 * Manages authentication tokens
 */

import axios from 'axios';

// Base API URL
const API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================================
// AUTHENTICATION API
// ========================================

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

// ========================================
// ROOM API
// ========================================

export const roomAPI = {
  // For students we expose a public all-rooms endpoint (authenticated)
  getAllRooms: (params) => api.get('/allocations/all-rooms-public', { params }),
  getAvailableRooms: () => api.get('/allocations/available-rooms'),
  getRoomById: (roomID) => api.get(`/rooms/${roomID}`),
  createRoom: (data) => api.post('/rooms', data),
  updateRoom: (roomID, data) => api.put(`/rooms/${roomID}`, data),
  deleteRoom: (roomID) => api.delete(`/rooms/${roomID}`)
};

// ========================================
// COMPLAINTS API
// ========================================
export const complaintAPI = {
  raise: (data) => api.post('/complaints', data),
  myComplaints: () => api.get('/complaints/student'),
  allComplaints: (params) => api.get('/complaints/all', { params }),
  assign: (id, data) => api.put(`/complaints/${id}/assign`, data),
  resolve: (id, data) => api.put(`/complaints/${id}/resolve`, data)
};

// ========================================
// ALLOCATION API
// ========================================

export const allocationAPI = {
  allocateRoom: (data) => api.post('/allocations/allocate', data),
  getCurrentAllocation: () => api.get('/allocations/my-allocation'),
  getAllocationHistory: () => api.get('/allocations/my-history'),
  cancelAllocation: (allocationID) => api.delete(`/allocations/${allocationID}/cancel`),
  joinWaitingList: (data) => api.post('/allocations/waiting-list', data),
  getMyWaitingList: () => api.get('/allocations/waiting-list/mine'),
  cancelWaitingEntry: (waitingID) => api.delete(`/allocations/waiting-list/${waitingID}`),
  getWaitingListAdmin: (params) => api.get('/allocations/waiting-list', { params }),
  getReallocationLogs: () => api.get('/allocations/reallocation-logs'),
  triggerReallocationSweep: () => api.post('/allocations/reallocation-sweep'),
  submitBookingRequest: (data) => api.post('/allocations/book-with-details', data),
  getMyBookingRequests: () => api.get('/allocations/my-bookings'),
  getMyBookingPaymentTransactions: () => api.get('/allocations/my-booking-payments')
};

// ========================================
// PAYMENT API
// ========================================

export const paymentAPI = {
  getMyPaymentStatus: () => api.get('/payments/status-me'),
  getMyPaymentHistory: (params) => api.get('/payments/history-me', { params }),
  getPaymentStatus: (studentID) => api.get(`/payments/status/${studentID}`),
  getPaymentHistory: (studentID, params) => api.get(`/payments/history/${studentID}`, { params }),
  getAllStudentsPayments: (params) => api.get('/payments/all', { params }),
  recordPayment: (data) => api.post('/payments/record', data),
  calculateFine: (paymentID) => api.get(`/payments/fine/${paymentID}`),
  generateReceipt: (paymentID) => api.get(`/payments/receipt/${paymentID}`),
  getPaymentSummary: () => api.get('/payments/summary')
};

// ========================================
// LEAVE API
// ========================================

export const leaveAPI = {
  applyLeave: (data) => api.post('/leaves/apply', data),
  getMyLeaves: () => api.get('/leaves/mine'),
  getAllLeaves: (params) => api.get('/leaves/all', { params }),
  updateLeaveStatus: (leaveID, data) => api.put(`/leaves/${leaveID}/status`, data)
};

// ========================================
// ADMIN API
// ========================================

export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAllAllocations: (params) => api.get('/admin/allocations', { params }),
  getAllStudents: (params) => api.get('/admin/students', { params }),
  assignHostel: (data) => api.put('/admin/assign-hostel', data),
  getUnauthorizedLogs: () => api.get('/admin/unauthorized-logs'),
  getAllocationLogs: () => api.get('/admin/allocation-logs'),
  getBookingRequests: (params) => api.get('/allocations/booking-requests', { params }),
  approveBookingRequest: (bookingID, data) => api.post(`/allocations/booking-requests/${bookingID}/approve`, data),
  rejectBookingRequest: (bookingID, data) => api.post(`/allocations/booking-requests/${bookingID}/reject`, data)
};

// ========================================
// SAFETY API
// ========================================

export const safetyAPI = {
  updateLocation: (data) => api.post('/location/update', data),
  getAllLatestLocations: () => api.get('/location/all'),
  createEmergencyAlert: (data) => api.post('/emergency', data),
  getEmergencyAlerts: () => api.get('/emergency'),
  resolveEmergencyAlert: (id) => api.put(`/emergency/${id}/resolve`),
  createIncident: (data) => api.post('/incidents', data),
  getRecentIncidents: () => api.get('/incidents/recent'),
  getSafetyMetrics: () => api.get('/reports/metrics'),
  getHighRiskAreas: () => api.get('/reports/high-risk-areas'),
  getIncidentTrends: (params) => api.get('/reports/trends', { params }),
  exportSafetyReport: (type = 'alerts') =>
    api.get('/reports/export', {
      params: { type },
      responseType: 'blob'
    })
};

export default api;
