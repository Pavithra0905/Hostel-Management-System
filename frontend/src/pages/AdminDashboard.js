/**
 * ADMIN DASHBOARD
 * Main dashboard for Admin and Warden roles
 * Shows room statistics and allocation reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, roomAPI, leaveAPI, allocationAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import WardenComplaints from './WardenComplaints';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isWarden = user?.role === 'Warden';
  
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(isWarden ? 'bookings' : 'overview');
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    type: 'Single',
    roomCategory: 'Regular',
    capacity: 1,
    facilities: '',
    floor: '',
    hostelBlock: '',
    status: 'Available'
  });
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomSubmitting, setRoomSubmitting] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomFilters, setRoomFilters] = useState({
    type: 'All',
    roomCategory: 'All',
    status: 'All'
  });

  const filteredRooms = rooms.filter((room) => {
    const matchesType = roomFilters.type === 'All' || room.type === roomFilters.type;
    const matchesCategory = roomFilters.roomCategory === 'All' || (room.roomCategory || 'Regular') === roomFilters.roomCategory;
    const matchesStatus = roomFilters.status === 'All' || room.status === roomFilters.status;
    return matchesType && matchesCategory && matchesStatus;
  });

  useEffect(() => {
    if (isWarden) {
      setActiveTab((current) => (current === 'overview' ? 'bookings' : current));
    }
  }, [isWarden]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!message.text) return undefined;

    const timer = setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3500);

    return () => clearTimeout(timer);
  }, [message]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResponse, roomsResponse] = await Promise.all([
        adminAPI.getDashboardStats(),
        roomAPI.getAllRooms()
      ]);

      setStats(statsResponse.data.data);
      setRooms(roomsResponse.data.data);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Failed to fetch data:', error);
      const errMsg = error.response?.data?.message || error.message || 'Failed to fetch admin data';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const resetRoomForm = () => {
    setRoomForm({
      roomNumber: '',
      type: 'Single',
      roomCategory: 'Regular',
      capacity: 1,
      facilities: '',
      floor: '',
      hostelBlock: '',
      status: 'Available'
    });
    setEditingRoomId(null);
    setRoomModalOpen(false);
  };

  const handleRoomFormChange = (event) => {
    const { name, value } = event.target;
    setRoomForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoomSubmit = async (event) => {
    event.preventDefault();
    setRoomSubmitting(true);

    try {
      const payload = {
        ...roomForm,
        capacity: Number(roomForm.capacity),
        floor: roomForm.floor === '' ? null : Number(roomForm.floor),
        hostelBlock: roomForm.hostelBlock || null,
        facilities: roomForm.facilities || null,
        status: roomForm.status || 'Available'
      };

      if (editingRoomId) {
        await roomAPI.updateRoom(editingRoomId, payload);
        setMessage({ type: 'success', text: 'Room updated successfully' });
      } else {
        await roomAPI.createRoom(payload);
        setMessage({ type: 'success', text: 'Room created successfully' });
      }

      resetRoomForm();
      await fetchData();
      setActiveTab('rooms');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save room'
      });
    } finally {
      setRoomSubmitting(false);
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoomId(room.roomID);
    setRoomForm({
      roomNumber: room.roomNumber || '',
      type: room.type || 'Single',
      roomCategory: room.roomCategory || 'Regular',
      capacity: room.capacity ?? 1,
      facilities: room.facilities || '',
      floor: room.floor ?? '',
      hostelBlock: room.hostelBlock || '',
      status: room.status || 'Available'
    });
    setActiveTab('rooms');
    setRoomModalOpen(true);
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Delete room ${room.roomNumber}? This cannot be undone.`)) {
      return;
    }

    try {
      await roomAPI.deleteRoom(room.roomID);
      setMessage({ type: 'success', text: 'Room deleted successfully' });
      if (editingRoomId === room.roomID) {
        resetRoomForm();
      }
      await fetchData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to delete room'
      });
    }
  };

  const openNewRoomModal = () => {
    resetRoomForm();
    setRoomModalOpen(true);
  };

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const userInitial = user?.email ? user.email[0].toUpperCase() : 'U';

  const getRoomStatusClass = (status) => {
    switch (status) {
      case 'Available':
        return 'badge-success';
      case 'Occupied':
        return 'badge-danger';
      case 'Maintenance':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
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
            <div className="brand-subtitle">{user.role} Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            Room Details
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeTab === 'allocations' ? 'active' : ''}`}
            onClick={() => setActiveTab('allocations')}
          >
            Allocations
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Booking Requests
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeTab === 'complaints' ? 'active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            Complaints
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeTab === 'leaves' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaves')}
          >
            Leave Requests
          </button>
          <button
            type="button"
            className={`sidebar-item ${activeTab === 'reallocation' ? 'active' : ''}`}
            onClick={() => setActiveTab('reallocation')}
          >
            Reallocation Queue
          </button>
          {!isWarden && (
            <button
              type="button"
              className={`sidebar-item ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              Students
            </button>
          )}
          <div className="sidebar-divider"></div>
          <button type="button" className="sidebar-item danger" onClick={handleLogout}>
            Logout
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
                <div className="user-role">{user.role}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">

        {message.text && (
          <div className={`toast toast-${message.type || 'error'}`}>
            <span>{message.text}</span>
            <button type="button" className="toast-close" onClick={() => setMessage({ type: '', text: '' })}>
              ×
            </button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && !isWarden && (
          <>
            <div className="section-title">Dashboard</div>

            <div className="stat-strip">
              <div className="stat-card alt">
                <div className="stat-label">Total Rooms</div>
                <div className="stat-value">{stats.roomStatistics.totalRooms}</div>
                <div className="stat-icon">R</div>
              </div>

              <div className="stat-card alt">
                <div className="stat-label">Total Students</div>
                <div className="stat-value">{stats.studentCount}</div>
                <div className="stat-icon">S</div>
              </div>

              <div className="stat-card alt">
                <div className="stat-label">Available Rooms</div>
                <div className="stat-value">{stats.roomStatistics.availableRooms}</div>
                <div className="stat-icon">A</div>
              </div>

              <div className="stat-card alt">
                <div className="stat-label">Occupied Rooms</div>
                <div className="stat-value">{stats.roomStatistics.occupiedRooms}</div>
                <div className="stat-icon">O</div>
              </div>
            </div>

            {/* Allocation by Year */}
            <div className="table-card">
              <div className="table-header">
                <h3>Allocations by Academic Year</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Total Allocations</th>
                    <th>Active Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.allocationByYear.map(item => (
                    <tr key={item.year}>
                      <td><strong>{item.year} Year</strong></td>
                      <td>{item.totalAllocations}</td>
                      <td>{item.activeAllocations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent Allocations */}
            <div className="table-card">
              <div className="table-header">
                <h3>Recent Allocations</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Year</th>
                    <th>Room Number</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAllocations.map(item => (
                    <tr key={item.allocationID}>
                      <td>{item.studentName}</td>
                      <td>{item.year}</td>
                      <td>{item.roomNumber}</td>
                      <td>{item.type}</td>
                      <td>{new Date(item.allocatedDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          item.status === 'Active' ? 'badge-success' : 'badge-info'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Rooms Tab */}
        {activeTab === 'rooms' && (
          <>
            <div className="table-card">
              <div className="table-header">
                <h3>All Rooms</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="table-filter"
                    value={roomFilters.type}
                    onChange={(event) => setRoomFilters((prev) => ({ ...prev, type: event.target.value }))}
                  >
                    <option value="All">All Types</option>
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                  </select>
                  <select
                    className="table-filter"
                    value={roomFilters.roomCategory}
                    onChange={(event) => setRoomFilters((prev) => ({ ...prev, roomCategory: event.target.value }))}
                  >
                    <option value="All">All Categories</option>
                    <option value="Regular">Regular</option>
                    <option value="PhD">PhD</option>
                  </select>
                  <select
                    className="table-filter"
                    value={roomFilters.status}
                    onChange={(event) => setRoomFilters((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    <option value="All">All Status</option>
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                  {!isWarden && (
                    <button type="button" className="btn btn-success btn-sm" onClick={openNewRoomModal}>
                      Add Room
                    </button>
                  )}
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Room Number</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Block</th>
                    <th>Floor</th>
                    <th>Capacity</th>
                    <th>Occupancy</th>
                    <th>Status</th>
                    <th>Facilities</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map(room => (
                    <tr key={room.roomID}>
                      <td><strong>{room.roomNumber}</strong></td>
                      <td>{room.type}</td>
                      <td>{room.roomCategory || 'Regular'}</td>
                      <td>{room.hostelBlock || '-'}</td>
                      <td>{room.floor ?? '-'}</td>
                      <td>{room.capacity}</td>
                      <td>{room.occupancy}/{room.capacity}</td>
                      <td>
                        <span className={`badge ${getRoomStatusClass(room.status)}`}>
                          {room.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{room.facilities || '-'}</td>
                      <td>
                        <div className="action-group">
                          <button type="button" className="btn btn-success btn-sm" onClick={() => handleEditRoom(room)}>
                            Edit
                          </button>
                          {!isWarden && (
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteRoom(room)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {roomModalOpen && (
          <div className="modal-overlay" role="presentation" onClick={(event) => {
            if (event.target === event.currentTarget) {
              resetRoomForm();
            }
          }}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="room-modal-title">
              <div className="modal-header">
                <h3 id="room-modal-title">{editingRoomId ? 'Edit Room' : 'Add Room'}</h3>
                <button type="button" className="modal-close" onClick={resetRoomForm}>×</button>
              </div>
              <form onSubmit={handleRoomSubmit} className="modal-form">
                <div className="modal-grid">
                  <input name="roomNumber" value={roomForm.roomNumber} onChange={handleRoomFormChange} placeholder="Room Number" required />
                  <select name="type" value={roomForm.type} onChange={handleRoomFormChange} required>
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                  </select>
                  <select name="roomCategory" value={roomForm.roomCategory} onChange={handleRoomFormChange} required>
                    <option value="Regular">Regular</option>
                    <option value="PhD">PhD</option>
                  </select>
                  <input name="capacity" type="number" min="1" value={roomForm.capacity} onChange={handleRoomFormChange} required />
                  <input name="floor" type="number" min="0" value={roomForm.floor} onChange={handleRoomFormChange} placeholder="Floor" />
                  <input name="hostelBlock" value={roomForm.hostelBlock} onChange={handleRoomFormChange} placeholder="Block" />
                  <select name="status" value={roomForm.status} onChange={handleRoomFormChange} required>
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <textarea
                  name="facilities"
                  value={roomForm.facilities}
                  onChange={handleRoomFormChange}
                  placeholder="Facilities"
                  rows={4}
                />
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetRoomForm}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={roomSubmitting}>
                    {roomSubmitting ? 'Saving...' : editingRoomId ? 'Update Room' : 'Add Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Allocations Tab */}
        {activeTab === 'allocations' && (
          <AllocationsList />
        )}

        {/* Booking Requests Tab */}
        {activeTab === 'bookings' && (
          <BookingRequestsList />
        )}

        {/* Complaints quick panel */}
        {activeTab === 'complaints' && (
          <WardenComplaints embedded />
        )}

        {/* Leave Requests Tab */}
        {activeTab === 'leaves' && (
          <LeaveRequestsList />
        )}

        {/* Reallocation Tab */}
        {activeTab === 'reallocation' && (
          <ReallocationQueuePanel />
        )}

        {/* Students Tab */}
        {activeTab === 'students' && !isWarden && (
          <StudentsList />
        )}
        </div>
      </main>
    </div>
  );
};

// Component for Allocations List
const AllocationsList = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [cancellingId, setCancellingId] = useState(null);

  const fetchAllocations = useCallback(async () => {
    try {
      const response = await adminAPI.getAllAllocations();
      setAllocations(response.data.data || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Failed to fetch allocations:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to fetch allocations' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [fetchAllocations]);

  const handleCancelAllocation = async (allocationID, studentName, roomNumber) => {
    const confirmCancel = window.confirm(
      `Cancel allocation for ${studentName} in room ${roomNumber}?`
    );

    if (!confirmCancel) {
      return;
    }

    setCancellingId(allocationID);
    try {
      const response = await allocationAPI.cancelAllocation(allocationID);
      setMessage({
        type: 'success',
        text: response.data?.message || 'Allocation cancelled successfully'
      });
      await fetchAllocations();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to cancel allocation'
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>All Allocations</h3>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Email</th>
            <th>Year</th>
            <th>Room Number</th>
            <th>Type</th>
            <th>Allocated Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map(item => (
            <tr key={item.allocationID}>
              <td>{item.studentName}</td>
              <td>{item.email}</td>
              <td>{item.year}</td>
              <td>{item.roomNumber}</td>
              <td>{item.type}</td>
              <td>{new Date(item.allocatedDate).toLocaleDateString()}</td>
              <td>
                <span className={`badge ${
                  item.status === 'Active' ? 'badge-success' : 
                  item.status === 'Cancelled' ? 'badge-danger' : 'badge-info'
                }`}>
                  {item.status}
                </span>
              </td>
              <td>
                {item.status === 'Active' ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancelAllocation(item.allocationID, item.studentName, item.roomNumber)}
                    disabled={cancellingId === item.allocationID}
                  >
                    {cancellingId === item.allocationID ? 'Cancelling...' : 'Cancel'}
                  </button>
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const LeaveRequestsList = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchLeaveRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await leaveAPI.getAllLeaves({ status: statusFilter || undefined });
      setLeaveRequests(response.data.data || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to fetch leave requests' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleUpdateStatus = async (leaveID, status) => {
    try {
      await leaveAPI.updateLeaveStatus(leaveID, { status });
      setMessage({ type: 'success', text: `Leave request ${status.toLowerCase()} successfully` });
      await fetchLeaveRequests();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update leave status' });
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="table-card">
      <div className="table-header" style={{ gap: '10px', alignItems: 'center' }}>
        <h3>Student Leave Requests</h3>
        <select
          className="table-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Reg No</th>
            <th>Email</th>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {leaveRequests.map((item) => (
            <tr key={item.leaveID}>
              <td>{item.studentName}</td>
              <td>{item.regNo || '-'}</td>
              <td>{item.email}</td>
              <td>{new Date(item.fromDate).toLocaleDateString()}</td>
              <td>{new Date(item.toDate).toLocaleDateString()}</td>
              <td>{item.totalDays}</td>
              <td>
                <span className={`badge ${
                  item.status === 'Approved'
                    ? 'badge-success'
                    : item.status === 'Rejected'
                    ? 'badge-danger'
                    : 'badge-warning'
                }`}>
                  {item.status}
                </span>
              </td>
              <td>{item.reason || '-'}</td>
              <td>
                {item.status === 'Pending' ? (
                  <div className="action-group">
                    <button type="button" className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(item.leaveID, 'Approved')}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(item.leaveID, 'Rejected')}>
                      Reject
                    </button>
                  </div>
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
          {leaveRequests.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center' }}>No leave requests found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const ReallocationQueuePanel = () => {
  const [loading, setLoading] = useState(true);
  const [runningSweep, setRunningSweep] = useState(false);
  const [waitingList, setWaitingList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [waitingResponse, logsResponse] = await Promise.all([
        allocationAPI.getWaitingListAdmin({ status: 'Pending' }),
        allocationAPI.getReallocationLogs()
      ]);

      setWaitingList(waitingResponse.data.data || []);
      setLogs(logsResponse.data.data || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to fetch reallocation data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunSweep = async () => {
    setRunningSweep(true);
    try {
      const response = await allocationAPI.triggerReallocationSweep();
      const totalAllocated = response.data?.data?.totalAllocated || 0;
      setMessage({ type: 'success', text: `Reallocation sweep completed. Auto-allocated: ${totalAllocated}` });
      await fetchData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to run reallocation sweep' });
    } finally {
      setRunningSweep(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <>
      <div className="table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <h3>Pending Waiting List (FIFO)</h3>
          <button type="button" className="btn btn-success btn-sm" onClick={handleRunSweep} disabled={runningSweep}>
            {runningSweep ? 'Running...' : 'Run Reallocation Sweep'}
          </button>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Queue #</th>
              <th>Student</th>
              <th>Reg No</th>
              <th>Year</th>
              <th>Room</th>
              <th>Type</th>
              <th>Requested At</th>
            </tr>
          </thead>
          <tbody>
            {waitingList.map((item) => (
              <tr key={item.waitingID}>
                <td>{item.queuePosition}</td>
                <td>{item.studentName}</td>
                <td>{item.regNo || '-'}</td>
                <td>{item.year}</td>
                <td>{item.roomNumber}</td>
                <td>{item.type} ({item.roomCategory})</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {waitingList.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>No pending waiting-list entries.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-card" style={{ marginTop: '1rem' }}>
        <div className="table-header">
          <h3>Recent Auto-Reallocation Logs</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Student</th>
              <th>Room</th>
              <th>New Allocation ID</th>
              <th>Rule</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((item) => (
              <tr key={item.reallocationLogID}>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                <td>{item.studentName}</td>
                <td>{item.roomNumber}</td>
                <td>{item.newAllocationID}</td>
                <td>{item.ruleApplied}</td>
                <td>{item.notes || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No reallocation logs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

// Component for Students List
const StudentsList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostelInputs, setHostelInputs] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await adminAPI.getAllStudents();
      setStudents(response.data.data);
      setMessage({ type: '', text: '' });
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to fetch students' });
    } finally {
      setLoading(false);
    }
  };

  const handleHostelInputChange = (studentID, value) => {
    setHostelInputs((prev) => ({
      ...prev,
      [studentID]: value
    }));
  };

  const handleAssignHostel = async (studentID) => {
    const hostelID = (hostelInputs[studentID] || '').trim();

    if (!hostelID) {
      setMessage({ type: 'error', text: 'Hostel ID is required before assignment' });
      return;
    }

    setAssigningId(studentID);
    try {
      await adminAPI.assignHostel({ studentID, hostelID });
      setMessage({ type: 'success', text: 'Hostel ID assigned successfully' });
      setHostelInputs((prev) => {
        const next = { ...prev };
        delete next[studentID];
        return next;
      });
      await fetchStudents();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to assign hostel ID'
      });
    } finally {
      setAssigningId(null);
    }
  };

  const unassignedCount = students.filter((student) => !student.hostelID).length;

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>All Students</h3>
        <span className="badge badge-warning">Unassigned Hostel IDs: {unassignedCount}</span>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Reg No</th>
            <th>Hostel ID</th>
            <th>Name</th>
            <th>Role</th>
            <th>Category</th>
            <th>Hostel Fee</th>
            <th>Email</th>
            <th>Year</th>
            <th>Department</th>
            <th>Allocation Status</th>
            <th>Room Number</th>
            <th>Assign Hostel</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            // Determine student category
            let categoryLabel = 'Regular';
            let rowBackground = undefined;
            
            if (student.isExService) {
              categoryLabel = 'Ex-Service';
              rowBackground = '#ecfdf5'; // Green for free
            } else if (student.isCurrentStaff) {
              categoryLabel = 'Current Staff';
              rowBackground = '#fef3c7'; // Yellow for 50% discount
            }
            
            return (
            <tr key={student.studentID} style={{ background: rowBackground }}>
              <td>{student.regNo || '-'}</td>
              <td>{student.hostelID || '-'}</td>
              <td>{student.name}</td>
              <td>{student.role || 'Student'}</td>
              <td>
                <span className={`badge ${
                  student.isExService ? 'badge-success' : student.isCurrentStaff ? 'badge-warning' : 'badge-info'
                }`}>
                  {categoryLabel}
                </span>
              </td>
              <td>
                <span className={`badge ${
                  Number(student.hostelFee) === 0 ? 'badge-success' : 
                  Number(student.hostelFee) === 2500 ? 'badge-warning' : 'badge-info'
                }`}>
                  {Number(student.hostelFee || 0).toFixed(2)}
                </span>
              </td>
              <td>{student.email}</td>
              <td>{student.year}</td>
              <td>{student.department || '-'}</td>
              <td>
                <span className={`badge ${
                  student.allocationStatus === 'Allocated' ? 'badge-success' : 'badge-warning'
                }`}>
                  {student.allocationStatus}
                </span>
              </td>
              <td>{student.roomNumber || '-'}</td>
              <td>
                {student.hostelID ? (
                  <span className="badge badge-info">Assigned</span>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Hostel ID"
                      value={hostelInputs[student.studentID] || ''}
                      onChange={(event) => handleHostelInputChange(student.studentID, event.target.value)}
                      style={{ width: 110 }}
                    />
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => handleAssignHostel(student.studentID)}
                      disabled={assigningId === student.studentID}
                    >
                      {assigningId === student.studentID ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Component for Booking Requests
const BookingRequestsList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }
      if (paymentFilter !== 'All') {
        params.paymentStatus = paymentFilter;
      }
      const response = await adminAPI.getBookingRequests(params);
      setBookings(response.data.data || []);
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to fetch booking requests'
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter]);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, paymentFilter, fetchBookings]);

  const handleApprove = async (bookingID) => {
    if (!window.confirm('Approve this booking request and allocate the room?')) {
      return;
    }

    try {
      await adminAPI.approveBookingRequest(bookingID, {});
      setMessage({ type: 'success', text: 'Booking request approved' });
      fetchBookings();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to approve booking request'
      });
    }
  };

  const handleReject = async (bookingID) => {
    if (!window.confirm('Reject this booking request?')) {
      return;
    }

    const remarks = window.prompt('Reason (optional):', '');

    try {
      await adminAPI.rejectBookingRequest(bookingID, { remarks });
      setMessage({ type: 'success', text: 'Booking request rejected' });
      fetchBookings();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to reject booking request'
      });
    }
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>Booking Requests</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="table-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
            <option value="All">All</option>
          </select>
          <select
            className="table-filter"
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="All">All Payments</option>
          </select>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Year</th>
            <th>Room</th>
            <th>Start Date</th>
            <th>Duration</th>
            <th>Seaters</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Receipt</th>
            <th>Proof</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td colSpan="13" style={{ textAlign: 'center', color: '#64748b' }}>
                No booking requests found.
              </td>
            </tr>
          ) : (
            bookings.map((booking) => (
              <tr key={booking.bookingID}>
                <td>{booking.studentName}</td>
                <td>{booking.email}</td>
                <td>{booking.year}</td>
                <td>{booking.roomNumber}</td>
                <td>{formatDate(booking.startDate)}</td>
                <td>{booking.duration} days</td>
                <td>{booking.noOfSeaters}</td>
                <td>₹{Number(booking.totalAmount || 0).toFixed(0)}</td>
                <td>
                  <span className={`badge ${booking.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                    {booking.paymentStatus || 'Unpaid'}
                  </span>
                </td>
                <td>
                  {booking.receiptPath ? (
                    <a
                      href={`http://localhost:5000${booking.receiptPath}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Receipt
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Not uploaded</span>
                  )}
                </td>
                <td>
                  {booking.paymentProofPath ? (
                    <a
                      href={`http://localhost:5000${booking.paymentProofPath}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Proof
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No upload</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${
                    booking.status === 'Approved' ? 'badge-success' :
                    booking.status === 'Rejected' ? 'badge-danger' :
                    booking.status === 'Cancelled' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td>
                  <div className="action-group">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => handleApprove(booking.bookingID)}
                      disabled={booking.status !== 'Pending'}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(booking.bookingID)}
                      disabled={booking.status !== 'Pending'}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard;
