import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { complaintAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORY_TO_ROUTE = {
  'Food Issue': 'food',
  'Safety': 'safety',
  'Health': 'health'
};

const ROUTE_TO_CATEGORY = {
  food: 'Food Issue',
  safety: 'Safety',
  health: 'Health'
};

const CATEGORY_META = {
  'Food Issue': {
    icon: '🍽️',
    subtitle: 'Monitor meal quality, hygiene, and kitchen operations.',
    accentClass: 'critical-accent-food'
  },
  Safety: {
    icon: '🛡️',
    subtitle: 'Track urgent safety incidents and guard response SLAs.',
    accentClass: 'critical-accent-safety'
  },
  Health: {
    icon: '🩺',
    subtitle: 'Prioritize medical and wellness related complaints.',
    accentClass: 'critical-accent-health'
  }
};

const CriticalAdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [complaints, setComplaints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [assignTo, setAssignTo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const pathSpecialization = (() => {
    const segment = location.pathname.split('/')[2];
    return ROUTE_TO_CATEGORY[segment] || null;
  })();

  const specialization = user?.specializedCategory || pathSpecialization;
  const categoryMeta = CATEGORY_META[specialization] || {
    icon: '⚠️',
    subtitle: 'Specialized complaint management console.',
    accentClass: 'critical-accent-default'
  };

  useEffect(() => {
    if (!specialization || !CATEGORY_TO_ROUTE[specialization]) {
      navigate('/admin/dashboard');
      return;
    }

    const fetchComplaints = async () => {
      try {
        const res = await complaintAPI.allComplaints({ category: specialization });
        setComplaints(res.data.data || []);
      } catch (err) {
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load complaints' });
      }
    };

    fetchComplaints();
  }, [navigate, specialization]);

  useEffect(() => {
    if (!message.text) return undefined;

    const timer = setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const refresh = async () => {
    try {
      const res = await complaintAPI.allComplaints({ category: specialization });
      setComplaints(res.data.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to refresh complaints' });
    }
  };

  const handleAssign = async () => {
    if (!selected) return;
    try {
      await complaintAPI.assign(selected.complaintID, {
        assignedTo: assignTo || `${specialization} Admin Desk`,
        remarks
      });
      setMessage({ type: 'success', text: 'Complaint assigned' });
      setSelected(null);
      setAssignTo('');
      setRemarks('');
      refresh();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Assignment failed' });
    }
  };

  const handleResolve = async (id) => {
    try {
      await complaintAPI.resolve(id, { remarks: remarks || 'Resolved by specialized admin' });
      setMessage({ type: 'success', text: 'Complaint resolved' });
      refresh();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Resolve failed' });
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'All' || (c.urgency || 'Medium') === urgencyFilter;
      const searchableText = `${c.studentName || ''} ${c.studentEmail || ''} ${c.roomNumber || ''} ${c.description || ''} ${c.category || ''}`.toLowerCase();
      const matchesQuery = searchQuery.trim() === '' || searchableText.includes(searchQuery.trim().toLowerCase());
      return matchesStatus && matchesUrgency && matchesQuery;
    });
  }, [complaints, searchQuery, statusFilter, urgencyFilter]);

  const dashboardStats = useMemo(() => {
    const total = complaints.length;
    const open = complaints.filter((c) => c.status === 'Open').length;
    const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;
    const criticalUrgency = complaints.filter((c) => (c.urgency || '').toLowerCase() === 'critical').length;
    return { total, open, inProgress, resolved, criticalUrgency };
  }, [complaints]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const statusClass = (s) => (s === 'Open' ? 'badge-danger' : s === 'In Progress' ? 'badge-warning' : 'badge-success');

  return (
    <div className="critical-dashboard-wrap">
      <div className={`critical-hero ${categoryMeta.accentClass}`}>
        <div className="critical-hero-copy">
          <h2>
            <span>{categoryMeta.icon}</span> {specialization || 'Critical'} Command Center
          </h2>
          <p>{categoryMeta.subtitle}</p>
        </div>
        <div className="critical-hero-actions">
          <button className="btn btn-secondary" onClick={refresh}>Refresh</button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>General Dashboard</button>
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="critical-stat-grid">
        <div className="critical-stat-card">
          <span>Total</span>
          <strong>{dashboardStats.total}</strong>
        </div>
        <div className="critical-stat-card">
          <span>Open</span>
          <strong>{dashboardStats.open}</strong>
        </div>
        <div className="critical-stat-card">
          <span>In Progress</span>
          <strong>{dashboardStats.inProgress}</strong>
        </div>
        <div className="critical-stat-card">
          <span>Resolved</span>
          <strong>{dashboardStats.resolved}</strong>
        </div>
        <div className="critical-stat-card">
          <span>Critical Urgency</span>
          <strong>{dashboardStats.criticalUrgency}</strong>
        </div>
      </div>

      <div className="critical-filter-bar">
        <input
          className="critical-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student, room, or complaint text"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
          <option value="All">All Urgency</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      <div className="critical-content-grid">
        <div className="critical-table-card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Room</th>
                <th>Status</th>
                <th>Urgency</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7}>No complaints found for selected filters.</td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr
                    key={c.complaintID}
                    onClick={() => setSelected(c)}
                    className={selected?.complaintID === c.complaintID ? 'critical-row-active' : ''}
                  >
                    <td>{c.complaintID}</td>
                    <td>
                      {c.studentName}
                      <div className="critical-subline">{c.studentEmail}</div>
                    </td>
                    <td>{c.roomNumber || '-'}</td>
                    <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
                    <td><span className="badge badge-info">{c.urgency || 'Medium'}</span></td>
                    <td>{new Date(c.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(c.complaintID);
                        }}
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="critical-side-panel">
          {selected ? (
            <>
              <h4>Complaint #{selected.complaintID}</h4>
              <p className="critical-side-meta">
                <strong>Student:</strong> {selected.studentName} ({selected.studentEmail})
              </p>
              <p className="critical-side-meta">
                <strong>Category:</strong> {selected.category} | <strong>Urgency:</strong> {selected.urgency || 'Medium'}
              </p>
              <p className="critical-side-description">{selected.description}</p>

              <div className="critical-form-stack">
                <input
                  placeholder="Assign to (team/person)"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                />
                <textarea
                  rows={4}
                  placeholder="Operational remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="critical-side-actions">
                <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
                <button className="btn btn-success" onClick={() => handleResolve(selected.complaintID)}>Resolve</button>
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Clear</button>
              </div>
            </>
          ) : (
            <div className="critical-empty-panel">
              Select a complaint from the table to view details and take action.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CriticalAdminDashboard;
