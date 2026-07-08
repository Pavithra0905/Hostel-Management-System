/**
 * STUDENT DASHBOARD
 * Main dashboard for student role
 * Shows room booking UI and allocation status
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { roomAPI, allocationAPI, complaintAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Blueprint from '../components/Blueprint';
import { StudentComplaintsContent } from './StudentComplaints';
import { AllocationHistoryContent } from './AllocationHistory';
import StudentFineDashboard from './StudentFineDashboard';
import StudentPaymentDashboard from './StudentPaymentDashboard';
import '../components/Blueprint.css';

const FIXED_MONTHLY_FEE = {
  1: 6000,
  2: 4000,
  phd: 10000
};

const getMonthlyFeeForRoom = (room, fallbackSeaters = 1, options = {}) => {
  const { isExService = false, isCurrentStaff = false } = options;

  if (room?.roomCategory === 'PhD') {
    const phdBase = FIXED_MONTHLY_FEE.phd;
    if (isExService) return 0;
    if (isCurrentStaff) return phdBase * 0.5;
    return phdBase;
  }

  let baseFee;
  if (room?.type === 'Double' || fallbackSeaters === 2) {
    baseFee = FIXED_MONTHLY_FEE[2];
  } else {
    baseFee = FIXED_MONTHLY_FEE[1];
  }

  if (isExService) return 0;
  if (isCurrentStaff) return baseFee * 0.5;
  return baseFee;
};

const HOSTEL_CONTACTS = {
  emergency: process.env.REACT_APP_EMERGENCY_CONTACT || '112',
  hostelOffice: process.env.REACT_APP_HOSTEL_OFFICE_CONTACT || 'Not configured',
  wardenDesk: process.env.REACT_APP_WARDEN_CONTACT || 'Not configured'
};

const getRoomRules = (room) => {
  const rules = [
    'Keep noise low after lights-out time.',
    'Do not damage furniture, fixtures, or walls.',
    'Maintain cleanliness and dispose waste properly.',
    'No unauthorized guests overnight without approval.'
  ];

  if (room?.roomCategory === 'PhD') {
    rules.unshift('PhD rooms are reserved for PhD scholars only.');
  }

  if (room?.type === 'Single') {
    rules.unshift('Single occupancy room: keep the room reserved for one resident only.');
  } else if (room?.type === 'Double') {
    rules.unshift('Double occupancy room: share common space respectfully with your roommate.');
  }

  return rules;
};

const getRoomAmenities = (room) => {
  const source = room?.facilities || '';
  const amenities = source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return amenities.length ? amenities : ['WiFi', 'Bed', 'Study Table', 'Wardrobe'];
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const hostelFee = Number(user?.hostelFee ?? user?.studentDetails?.hostelFee ?? 5000);
  const isExServiceStudent = Boolean(user?.isExService || user?.studentDetails?.isExService || hostelFee === 0);
  const isCurrentStaffStudent = Boolean(
    user?.isCurrentStaff ||
    user?.studentDetails?.isCurrentStaff ||
    (!isExServiceStudent && hostelFee === 2500)
  );
  const [, setAvailableRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [currentAllocation, setCurrentAllocation] = useState(null);
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [bookingRequests, setBookingRequests] = useState([]);
  const [waitingListEntries, setWaitingListEntries] = useState([]);
  const [studentComplaints, setStudentComplaints] = useState([]);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [readNotifications, setReadNotifications] = useState({});
  const [bookingForm, setBookingForm] = useState({
    startDate: '',
    duration: 30,
    noOfSeaters: 1,
    foodRequired: false,
    monthlyFee: getMonthlyFeeForRoom(null, 1, {
      isExService: isExServiceStudent,
      isCurrentStaff: isCurrentStaffStudent
    }),
    isAmountPaid: false
  });

  const notificationStorageKey = `student_notifications_read_${user?.userID || user?.email || 'default'}`;
  const formatCurrency = (value) => `₹${Number(value || 0).toFixed(0)}`;
  

  // Fetch available rooms and current allocation
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allocResult, roomsResult, bookingsResult, waitingResult, complaintsResult] = await Promise.allSettled([
        allocationAPI.getCurrentAllocation(),
        roomAPI.getAvailableRooms(),
        allocationAPI.getMyBookingRequests(),
        allocationAPI.getMyWaitingList(),
        complaintAPI.myComplaints()
      ]);

      if (allocResult.status === 'fulfilled' && allocResult.value.data.data) {
        setCurrentAllocation(allocResult.value.data.data);
      } else {
        setCurrentAllocation(null);
      }

      if (roomsResult.status === 'fulfilled') {
        const rooms = roomsResult.value.data.data;
        setAvailableRooms(rooms);

        if (rooms.length === 0) {
          setMessage({
            type: 'info',
            text: roomsResult.value.data.message
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: roomsResult.reason?.response?.data?.message || 'Failed to fetch rooms'
        });
      }

      // Fetch all rooms for blueprint (authenticated endpoint)
      let fetchedAllRooms = [];
      try {
        const allRes = await roomAPI.getAllRooms();
        if (allRes.data && allRes.data.data) {
          fetchedAllRooms = allRes.data.data;
          setAllRooms(fetchedAllRooms);
        }
      } catch (err) {
        console.warn('Could not fetch all rooms for blueprint:', err?.response?.data?.message || err.message);
      }

      // Derive floors from allRooms first, fallback to available rooms if needed
      const sourceRooms = fetchedAllRooms.length ? fetchedAllRooms : (roomsResult.status === 'fulfilled' ? roomsResult.value.data.data : []);
      const floorSet = Array.from(new Set(sourceRooms.map(r => Number(r.floor)).filter(f => !Number.isNaN(f)))).sort((a,b)=>a-b);
      setFloors(floorSet);
      setSelectedFloor(floorSet.length ? floorSet[0] : null);

      if (bookingsResult.status === 'fulfilled') {
        setBookingRequests(bookingsResult.value.data.data || []);
      } else {
        setBookingRequests([]);
      }

      if (waitingResult.status === 'fulfilled') {
        setWaitingListEntries(waitingResult.value.data.data || []);
      } else {
        setWaitingListEntries([]);
      }

      if (complaintsResult.status === 'fulfilled') {
        setStudentComplaints(complaintsResult.value.data.data || []);
      } else {
        setStudentComplaints([]);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to fetch data'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(notificationStorageKey);
      setReadNotifications(stored ? JSON.parse(stored) : {});
    } catch (error) {
      setReadNotifications({});
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    localStorage.setItem(notificationStorageKey, JSON.stringify(readNotifications));
  }, [notificationStorageKey, readNotifications]);

  const notifications = useMemo(() => {
    const items = [];

    bookingRequests.forEach((booking) => {
      const bookingId = booking.bookingID;
      const bookingStatus = booking.status || 'Pending';
      const bookingType = booking.type || 'Room';
      const roomNumber = booking.roomNumber || 'N/A';

      if (bookingStatus !== 'Pending') {
        items.push({
          id: `booking-status-${bookingId}-${bookingStatus}`,
          kind: 'booking',
          title: `Booking ${bookingStatus}`,
          message: `Your booking for room ${roomNumber} (${bookingType}) is now ${bookingStatus}.`,
          createdAt: booking.updatedAt || booking.createdAt || booking.startDate || new Date().toISOString(),
          severity: bookingStatus === 'Rejected' ? 'high' : 'normal'
        });
      }

      if ((booking.paymentStatus || 'Unpaid') !== 'Paid') {
        items.push({
          id: `due-reminder-${bookingId}-${booking.paymentStatus || 'Unpaid'}`,
          kind: 'due',
          title: 'Due Reminder',
          message: `Payment is pending for room ${roomNumber}. Amount due: ${formatCurrency(booking.totalAmount)}.`,
          createdAt: booking.updatedAt || booking.createdAt || booking.startDate || new Date().toISOString(),
          severity: 'high'
        });
      }
    });

    studentComplaints.forEach((complaint) => {
      const status = complaint.status || 'Open';
      if (status !== 'Open') {
        items.push({
          id: `complaint-status-${complaint.complaintID}-${status}`,
          kind: 'complaint',
          title: `Complaint ${status}`,
          message: `Your ${complaint.category || 'hostel'} complaint is ${status}.`,
          createdAt: complaint.updatedAt || complaint.createdAt || new Date().toISOString(),
          severity: status === 'Resolved' ? 'normal' : 'medium'
        });
      }
    });

    if (currentAllocation) {
      items.push({
        id: `room-change-${currentAllocation.allocationID}-${currentAllocation.roomNumber}`,
        kind: 'room',
        title: 'Room Update',
        message: `You are currently allocated to room ${currentAllocation.roomNumber} (${currentAllocation.type}).`,
        createdAt: currentAllocation.allocatedDate || new Date().toISOString(),
        severity: 'normal'
      });
    }

    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bookingRequests, currentAllocation, studentComplaints]);

  const unreadCount = notifications.filter((item) => !readNotifications[item.id]).length;

  const markNotificationAsRead = (notificationId) => {
    setReadNotifications((prev) => ({ ...prev, [notificationId]: true }));
  };

  const markAllNotificationsAsRead = () => {
    const all = {};
    notifications.forEach((item) => {
      all[item.id] = true;
    });
    setReadNotifications(all);
  };

  // Handle room selection
  const handleRoomClick = (room) => {
    if (currentAllocation) {
      setMessage({
        type: 'error',
        text: 'You already have an active room allocation'
      });
      return;
    }

    const seaters = room.type === 'Double' ? 2 : 1;
    setSelectedRoom(room);
    setBookingForm((prev) => ({
      ...prev,
      noOfSeaters: seaters,
      monthlyFee: getMonthlyFeeForRoom(room, seaters, {
        isExService: isExServiceStudent,
        isCurrentStaff: isCurrentStaffStudent
      })
    }));

    if (room.status === 'Available' && room.occupancy < room.capacity) {
      setMessage({ type: '', text: '' });
      return;
    }

    setMessage({
      type: 'info',
      text: 'Room is currently full or unavailable. You can join the waiting list for this room.'
    });
  };

  // Handle room allocation
  const handleAllocate = async () => {
    if (!selectedRoom) {
      setMessage({ type: 'error', text: 'Please select a room' });
      return;
    }

    if (selectedRoom.status !== 'Available' || selectedRoom.occupancy >= selectedRoom.capacity) {
      setMessage({ type: 'error', text: 'Selected room is not currently available. Join waiting list instead.' });
      return;
    }

    // Validate booking form
    if (!bookingForm.startDate) {
      setMessage({ type: 'error', text: 'Please enter a start date' });
      return;
    }

    if (bookingForm.duration <= 0) {
      setMessage({ type: 'error', text: 'Duration must be greater than 0' });
      return;
    }

    if (bookingForm.monthlyFee <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid monthly fee' });
      return;
    }

    try {
      const bookingData = {
        roomID: selectedRoom.roomID,
        startDate: bookingForm.startDate,
        duration: bookingForm.duration,
        noOfSeaters: bookingForm.noOfSeaters,
        foodRequired: bookingForm.foodRequired,
        foodCost: bookingForm.foodRequired ? 50 : 0,
        monthlyFee: bookingForm.monthlyFee,
        isAmountPaid: bookingForm.isAmountPaid
      };
      
      console.log('Submitting booking request:', bookingData);
      
      const response = await allocationAPI.submitBookingRequest(bookingData);

      console.log('Booking response:', response.data);

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Booking request submitted. System-generated receipt attached automatically.'
        });
        setSelectedRoom(null);
        setBookingForm({
          startDate: '',
          duration: 30,
          noOfSeaters: 1,
          foodRequired: false,
          monthlyFee: getMonthlyFeeForRoom(null, 1, {
            isExService: isExServiceStudent,
            isCurrentStaff: isCurrentStaffStudent
          }),
          isAmountPaid: false
        });
        // Refresh data
        fetchData();
      }
    } catch (error) {
      console.error('Booking request error:', error);
      console.error('Error response:', error.response);
      
      let errorMessage = 'Failed to submit booking request';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please restart the backend server.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Student record may be missing in database.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show alert with detailed error for debugging
      alert(`Booking Error:\n\n${errorMessage}\n\nStatus: ${error.response?.status || 'Unknown'}\n\nCheck browser console (F12) for details.`);
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
    }
  };

  const handleJoinWaitingList = async () => {
    if (!selectedRoom) {
      setMessage({ type: 'error', text: 'Please select a room first' });
      return;
    }

    try {
      const response = await allocationAPI.joinWaitingList({ roomID: selectedRoom.roomID });
      if (response.data.success) {
        setMessage({ type: 'success', text: `Joined waiting list for room ${selectedRoom.roomNumber}` });
        await fetchData();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to join waiting list'
      });
    }
  };

  const handleCancelWaitingEntry = async (waitingID) => {
    try {
      const response = await allocationAPI.cancelWaitingEntry(waitingID);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Waiting list entry cancelled' });
        await fetchData();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to cancel waiting list entry'
      });
    }
  };

  // Handle cancel allocation
  const handleCancelAllocation = async () => {
    if (!currentAllocation) return;

    if (!window.confirm('Are you sure you want to cancel your room allocation?')) {
      return;
    }

    try {
      const response = await allocationAPI.cancelAllocation(currentAllocation.allocationID);
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: 'Allocation cancelled successfully'
        });
        setCurrentAllocation(null);
        fetchData();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to cancel allocation'
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';
  const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '—');
  const formatAmount = formatCurrency;
  const getStatusClass = (status) => (status || 'Pending').toLowerCase();
  const formatNotificationDate = (value) => (value ? new Date(value).toLocaleString('en-GB') : 'Just now');
  
  // Determine student category and fee display
  let studentCategory = 'Regular';
  let categoryDisplay = '';
  if (isExServiceStudent) {
    studentCategory = 'Ex-Service';
    categoryDisplay = 'Ex-Service (Free)';
  } else if (isCurrentStaffStudent) {
    studentCategory = 'Current Staff';
    categoryDisplay = 'Current Staff (50% Discount) - ₹2500';
  } else {
    categoryDisplay = `Standard Fee - ₹${hostelFee.toFixed(2)}`;
  }

  const activeRoomInfo = currentAllocation
    ? {
        title: `Room ${currentAllocation.roomNumber}`,
        subtitle: `${currentAllocation.type} • Floor ${currentAllocation.floor} • Block ${currentAllocation.hostelBlock}`,
        roommateNames: currentAllocation.roommateNames
          ? currentAllocation.roommateNames.split(',').map((name) => name.trim()).filter(Boolean)
          : [],
        rules: getRoomRules(currentAllocation),
        amenities: getRoomAmenities(currentAllocation)
      }
    : null;

  const getNotificationTone = (severity) => {
    if (severity === 'high') return 'danger';
    if (severity === 'medium') return 'warning';
    return 'info';
  };

  const getNotificationIcon = (kind) => {
    if (kind === 'booking') return '📌';
    if (kind === 'complaint') return '🛠️';
    if (kind === 'due') return '💳';
    return '🏠';
  };


  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge">H</div>
          <div className="brand-text">
            <div className="brand-title">Hostel</div>
            <div className="brand-subtitle">Student Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'book' ? 'active' : ''}`}
            onClick={() => setActiveSection('book')}
          >
            🔑 Book Hostel
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'room' ? 'active' : ''}`}
            onClick={() => setActiveSection('room')}
          >
            🏠 My Room Details
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSection('history')}
          >
            📋 Log Activities
          </button>
          <button type="button" className={`sidebar-item ${activeSection === 'complaints' ? 'active' : ''}`} onClick={() => setActiveSection('complaints')}>
            🛠️ Complaints
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveSection('notifications')}
          >
            🔔 Notifications
            {unreadCount > 0 && <span className="sidebar-notification-count">{unreadCount}</span>}
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'fines' ? 'active' : ''}`}
            onClick={() => setActiveSection('fines')}
          >
            💰 Fines & In/Out Times
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveSection('payments')}
          >
            💳 Payments
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeSection === 'waiting' ? 'active' : ''}`}
            onClick={() => setActiveSection('waiting')}
          >
            ⏳ Waiting List
          </button>
          <div className="sidebar-divider"></div>
          <button type="button" className="sidebar-item danger" onClick={handleLogout}>
            🚪 Logout
          </button>
        </nav>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn menu-btn" aria-label="Menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div>
              <div className="topbar-title">Hostel Management System</div>
              <div className="topbar-subtitle">Today is {todayLabel}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-pill">{user.role}</div>
            <div className="user-chip">
              <div className="user-avatar">{userInitial}</div>
            <div className="user-meta">
                <div className="user-name">{user.email}</div>
                <div className="user-role">{user.role}{user?.regNo ? ` • Reg No: ${user.regNo}` : ''}</div>
                <div className="user-role">{user?.hostelID ? `Hostel ID: ${user.hostelID}` : 'Hostel ID: Not assigned yet'}</div>
                <div className="user-role">{categoryDisplay}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">

        {/* Alert Messages */}
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <>
            <div className="notification-summary-card">
              <div>
                <h3>Notification Center</h3>
                <p>
                  {unreadCount > 0
                    ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'} waiting for action.`
                    : 'All notifications are read.'}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setActiveSection('notifications')}>
                Open Notifications
              </button>
            </div>

            <div className="booking-requests-card">
              <div className="booking-requests-header">
                <h3>My Booking Status</h3>
                <span className="booking-requests-count">
                  {bookingRequests.length} request{bookingRequests.length === 1 ? '' : 's'}
                </span>
              </div>
              {bookingRequests.length === 0 ? (
                <div className="booking-empty">No booking requests yet.</div>
              ) : (
                <div className="booking-list">
                  {bookingRequests.map((booking) => (
                    <div className="booking-item" key={booking.bookingID}>
                      <div className="booking-main">
                        <div className="booking-room">
                          Room {booking.roomNumber}
                          <span className="spec-badge">{booking.type}</span>
                          <span className="spec-badge">{booking.noOfSeaters} Seater</span>
                          <span className="spec-badge">Payment: {booking.paymentStatus || 'Unpaid'}</span>
                        </div>
                        <div className="booking-meta">
                          Start {formatDate(booking.startDate)} • {booking.duration} days
                          {booking.foodRequired ? ' • Food included' : ''}
                        </div>
                        <div className="booking-meta">
                          Transaction: {booking.transactionReference || 'Pending generation'}
                          {booking.receiptPath ? (
                            <>
                              {' • '}
                              <a href={`http://localhost:5000${booking.receiptPath}`} target="_blank" rel="noreferrer">
                                View Receipt
                              </a>
                              {' • '}
                              <a href={`http://localhost:5000${booking.receiptPath}`} download>
                                Download Receipt
                              </a>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="booking-side">
                        <div className="booking-amount">{formatAmount(booking.totalAmount)}</div>
                        <span className={`status-pill status-${getStatusClass(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {currentAllocation ? (
              <div className="stat-card" style={{ marginBottom: '2rem' }}>
                <h3>Your Current Allocation</h3>
                <p><strong>Room Number:</strong> {currentAllocation.roomNumber}</p>
                <p><strong>Room Type:</strong> {currentAllocation.type}</p>
                <p><strong>Block:</strong> {currentAllocation.hostelBlock}</p>
                <p><strong>Floor:</strong> {currentAllocation.floor}</p>
                <p><strong>Allocated Date:</strong> {new Date(currentAllocation.allocatedDate).toLocaleDateString()}</p>
                <button
                  className="btn btn-danger"
                  onClick={handleCancelAllocation}
                  style={{ marginTop: '1rem' }}
                >
                  Cancel Allocation
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveSection('history')}
                  style={{ marginTop: '1rem', marginLeft: '0.5rem' }}
                >
                  View History
                </button>
              </div>
            ) : (
              <div className="alert alert-info">
                You do not have an active room allocation yet.
              </div>
            )}

            {activeRoomInfo && (
              <div className="room-info-card">
                <div className="room-info-header">
                  <div>
                    <h3>{activeRoomInfo.title}</h3>
                    <p>{activeRoomInfo.subtitle}</p>
                  </div>
                  <span className="room-info-badge">
                    {currentAllocation.roomCategory || 'Regular'}
                  </span>
                </div>

                <div className="room-info-grid">
                  <div className="room-info-panel">
                    <h4>Room Rules</h4>
                    <ul>
                      {activeRoomInfo.rules.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="room-info-panel">
                    <h4>Amenities</h4>
                    <div className="room-info-tags">
                      {activeRoomInfo.amenities.map((amenity) => (
                        <span key={amenity} className="room-info-tag">{amenity}</span>
                      ))}
                    </div>
                  </div>

                  <div className="room-info-panel">
                    <h4>Roommates</h4>
                    {activeRoomInfo.roommateNames.length > 0 ? (
                      <ul>
                        {activeRoomInfo.roommateNames.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>You do not have any active roommates in this room.</p>
                    )}
                  </div>

                  <div className="room-info-panel">
                    <h4>Emergency Contacts</h4>
                    <ul>
                      <li>Emergency: {HOSTEL_CONTACTS.emergency}</li>
                      <li>Hostel Office: {HOSTEL_CONTACTS.hostelOffice}</li>
                      <li>Warden Desk: {HOSTEL_CONTACTS.wardenDesk}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Room Selection - Simple Grid Like Picture */}
        {activeSection === 'book' && !currentAllocation && (
          <>
            <div className="simple-room-selector">
              {/* Header */}
              <div className="selector-header">
                <h2>Book Your Room</h2>
              </div>

              {/* Booking Form */}
              <div className="booking-form-card">
                <h3>Booking Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="startDate">Start Date *</label>
                    <input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={bookingForm.startDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="duration">Duration (Days) *</label>
                    <input
                      id="duration"
                      name="duration"
                      type="number"
                      value={bookingForm.duration}
                      onChange={(e) => setBookingForm({ ...bookingForm, duration: parseInt(e.target.value) || 0 })}
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="seaters">Number of Seaters *</label>
                    <select
                      id="seaters"
                      name="seaters"
                      value={bookingForm.noOfSeaters}
                      onChange={(e) => {
                        const seaters = parseInt(e.target.value);
                        setBookingForm({
                          ...bookingForm,
                          noOfSeaters: seaters,
                          monthlyFee: getMonthlyFeeForRoom(selectedRoom, seaters, {
                            isExService: isExServiceStudent,
                            isCurrentStaff: isCurrentStaffStudent
                          })
                        });
                      }}
                    >
                      <option value="1">Single</option>
                      <option value="2">Double</option>
                    </select>
                  </div>

                  {!isExServiceStudent ? (
                    <div className="form-group">
                      <label htmlFor="monthlyFee">Monthly Fee (₹) *</label>
                      <input
                        id="monthlyFee"
                        name="monthlyFee"
                        type="number"
                        value={bookingForm.monthlyFee}
                        readOnly
                        min="0"
                        step="100"
                      />
                      <span className="food-info">
                        {isCurrentStaffStudent
                          ? 'Current Staff fee (50%): Single ₹3000, Double ₹2000 per student, PhD ₹5000'
                          : 'Fixed fee: Single ₹6000, Double ₹4000 per student, PhD ₹10000'}
                      </span>
                    </div>
                  ) : (
                    <div className="form-group">
                      <span className="food-info">Ex-Service waiver applied.</span>
                    </div>
                  )}

                  {!isExServiceStudent && (
                    <div className="form-group checkbox">
                      <label htmlFor="isAmountPaid">
                        <input
                          id="isAmountPaid"
                          name="isAmountPaid"
                          type="checkbox"
                          checked={bookingForm.isAmountPaid}
                          onChange={(e) => setBookingForm({ ...bookingForm, isAmountPaid: e.target.checked })}
                        />
                        Amount Paid
                      </label>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Receipt</label>
                    <span className="food-info">System will generate a provisional receipt automatically after booking.</span>
                  </div>

                  {!isExServiceStudent && (
                    <>
                      <div className="form-group checkbox">
                        <label htmlFor="foodRequired">
                          <input
                            id="foodRequired"
                            name="foodRequired"
                            type="checkbox"
                            checked={bookingForm.foodRequired}
                            onChange={(e) => setBookingForm({ ...bookingForm, foodRequired: e.target.checked })}
                          />
                          Include Food Services
                        </label>
                      </div>

                      {bookingForm.foodRequired && (
                        <div className="form-group">
                          <span className="food-info">Food cost: ₹50/month</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Selected Room Info */}
              {selectedRoom && (
                <div className="selected-info-card">
                  <div className="info-left">
                    <h3>Room {selectedRoom.roomNumber}</h3>
                    <div className="room-specs">
                      <span className="spec-badge">{selectedRoom.type}</span>
                      <span className="spec-badge">Block {selectedRoom.hostelBlock}</span>
                      <span className="spec-badge">Floor {selectedRoom.floor}</span>
                      <span className="spec-badge">{selectedRoom.occupancy}/{selectedRoom.capacity} Occupied</span>
                    </div>
                    <p className="room-facilities">{selectedRoom.facilities}</p>
                  </div>
                  <div className="info-actions">
                    {selectedRoom.status === 'Available' && selectedRoom.occupancy < selectedRoom.capacity ? (
                      <button className="btn-confirm" onClick={handleAllocate}>
                        Confirm Booking
                      </button>
                    ) : (
                      <button className="btn-confirm" onClick={handleJoinWaitingList}>
                        Join Waiting List
                      </button>
                    )}
                    <button className="btn-cancel" onClick={() => setSelectedRoom(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Detailed Blueprint - shows rooms around central living area with floor selector */}
              <div className="rooms-section">
                <h3>Hostel Blueprint</h3>
                <p className="muted">Choose a floor to view rooms. Click a room to view details.</p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '14px' }}>Floor:</label>
                  <select value={selectedFloor ?? ''} onChange={(e) => setSelectedFloor(e.target.value === '' ? null : Number(e.target.value))}>
                    {floors.length === 0 && <option value="">No floors</option>}
                    {floors.map(f => (
                      <option key={f} value={f}>Floor {f}</option>
                    ))}
                  </select>
                  <button className="btn btn-secondary" onClick={fetchData} style={{ marginLeft: 8 }}>Refresh</button>
                </div>

                {selectedFloor === null ? (
                  <div className="alert alert-info">No rooms found to render blueprint. Try Refresh or re-login.</div>
                ) : (
                  <Blueprint
                    rooms={allRooms.filter(r => Number(r.floor) === Number(selectedFloor))}
                    selectedRoom={selectedRoom}
                    currentAllocation={currentAllocation}
                    onRoomClick={(room) => handleRoomClick(room)}
                    roomsPerFloor={Math.max(10, allRooms.filter(r => Number(r.floor) === Number(selectedFloor)).length)}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === 'book' && currentAllocation && (
          <div className="alert alert-info">
            You already have an active room allocation. Cancel it before booking a new room.
          </div>
        )}

        {/* My Room Details */}
        {activeSection === 'room' && (
          currentAllocation ? (
            <div className="room-info-card">
              <div className="room-info-header">
                <div>
                  <h3>My Room Details</h3>
                  <p>{currentAllocation.type} • Room {currentAllocation.roomNumber}</p>
                </div>
                <span className="room-info-badge">Active</span>
              </div>

              <div className="room-info-grid">
                <div className="room-info-panel">
                  <h4>Room Snapshot</h4>
                  <p><strong>Block:</strong> {currentAllocation.hostelBlock}</p>
                  <p><strong>Floor:</strong> {currentAllocation.floor}</p>
                  <p><strong>Allocated Date:</strong> {new Date(currentAllocation.allocatedDate).toLocaleDateString()}</p>
                  <p><strong>Facilities:</strong> {currentAllocation.facilities}</p>
                </div>
                <div className="room-info-panel">
                  <h4>Quick Actions</h4>
                  <button
                    className="btn btn-danger"
                    onClick={handleCancelAllocation}
                    style={{ marginBottom: '0.5rem' }}
                  >
                    Cancel Allocation
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setActiveSection('history')}
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              No room allocated yet. Use “Book Hostel” to submit a request.
            </div>
          )
        )}

        {activeSection === 'complaints' && (
          <div className="student-inline-section">
            <StudentComplaintsContent embedded />
          </div>
        )}

        {activeSection === 'history' && (
          <div className="student-inline-section">
            <AllocationHistoryContent embedded />
          </div>
        )}

        {activeSection === 'fines' && (
          <div className="student-inline-section">
            <StudentFineDashboard embedded />
          </div>
        )}

        {activeSection === 'payments' && (
          <div className="student-inline-section">
            <StudentPaymentDashboard embedded />
          </div>
        )}

        {activeSection === 'waiting' && (
          <div className="student-inline-section">
            <div className="table-card">
              <div className="table-header">
                <h3>My Waiting List Entries</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Queue Position</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingListEntries.map((entry) => (
                    <tr key={entry.waitingID}>
                      <td>{entry.roomNumber}</td>
                      <td>{entry.type}</td>
                      <td>{entry.roomCategory}</td>
                      <td>{entry.status === 'Pending' ? entry.queuePosition : '-'}</td>
                      <td>
                        <span className={`badge ${entry.status === 'Allocated' ? 'badge-success' : entry.status === 'Pending' ? 'badge-warning' : 'badge-info'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        {entry.status === 'Pending' ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelWaitingEntry(entry.waitingID)}
                          >
                            Cancel
                          </button>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {waitingListEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center' }}>
                        No waiting-list entries yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="student-inline-section">
            <div className="student-notification-center">
              <div className="student-notification-header">
                <div>
                  <h2>Notification Center</h2>
                  <p>Booking updates, complaint replies, dues, and room changes.</p>
                </div>
                <div className="notification-header-actions">
                  <span className="notification-unread-pill">Unread: {unreadCount}</span>
                  <button
                    className="btn btn-secondary"
                    onClick={markAllNotificationsAsRead}
                    disabled={notifications.length === 0 || unreadCount === 0}
                  >
                    Mark All as Read
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="alert alert-info">No notifications yet.</div>
              ) : (
                <div className="notification-list">
                  {notifications.map((item) => {
                    const isUnread = !readNotifications[item.id];
                    return (
                      <div key={item.id} className={`notification-item ${isUnread ? 'unread' : ''}`}>
                        <div className="notification-item-main">
                          <div className="notification-item-title-row">
                            <span className="notification-item-icon">{getNotificationIcon(item.kind)}</span>
                            <h4>{item.title}</h4>
                            <span className={`badge badge-${getNotificationTone(item.severity)}`}>
                              {item.kind}
                            </span>
                            {isUnread && <span className="notification-new-tag">New</span>}
                          </div>
                          <p>{item.message}</p>
                          <div className="notification-time">{formatNotificationDate(item.createdAt)}</div>
                        </div>
                        <div className="notification-item-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => markNotificationAsRead(item.id)}
                            disabled={!isUnread}
                          >
                            {isUnread ? 'Mark as Read' : 'Read'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
