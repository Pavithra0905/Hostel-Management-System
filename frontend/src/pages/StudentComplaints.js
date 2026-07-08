import React, { useEffect, useState } from 'react';
import { complaintAPI, allocationAPI } from '../services/api';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const COMPLAINT_CATEGORIES = {
  Regular: ['Electricity', 'Water', 'Cleanliness'],
  Critical: ['Food Issue', 'Safety', 'Health']
};

export const StudentComplaintsContent = ({ embedded = false, onBackToDashboard }) => {
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({
    roomID: '',
    complaintType: 'Regular',
    category: 'Electricity',
    description: '',
    urgency: 'Medium'
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [debug, setDebug] = useState(null);

  const fetchComplaints = async () => {
    try {
      const res = await complaintAPI.myComplaints();
      setComplaints(res.data.data || []);
    } catch (err) {
      const text = err.response?.data?.message || err.message || 'Failed to load complaints';
      setMessage({ type: 'error', text });
    }
  };

  useEffect(() => {
    const init = async () => {
      // try to prefill roomID from current allocation
      try {
        const allocRes = await allocationAPI.getCurrentAllocation();
        if (allocRes.data?.data) {
          setForm(f => ({ ...f, roomID: allocRes.data.data.roomID || f.roomID }));
        }
      } catch (e) {
        // ignore; allocation may not exist
      }

      await fetchComplaints();
    };

    init();
  }, []);

  const fetchComplaintsRaw = async () => {
    setDebug({ loading: true });
    try {
      const res = await api.get('/complaints/student', { validateStatus: () => true });
      setDebug({ status: res.status, data: res.data });
      if (res.status === 200) {
        setComplaints(res.data.data || []);
      } else {
        setMessage({ type: 'error', text: res.data?.message || `Status ${res.status}` });
      }
    } catch (err) {
      setDebug({ error: err.message });
      setMessage({ type: 'error', text: err.message || 'Network error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Basic client-side validation
    if (!form.roomID) {
      setMessage({ type: 'error', text: 'Please enter your Room ID before submitting.' });
      return;
    }
    const allowedUrgency = ['Low','Medium','High','Critical'];
    const allowedCategories = [...COMPLAINT_CATEGORIES.Regular, ...COMPLAINT_CATEGORIES.Critical];
    if (!form.urgency || !allowedUrgency.includes(form.urgency)) {
      setMessage({ type: 'error', text: 'Please select a valid urgency level.' });
      return;
    }
    if (!form.category || !allowedCategories.includes(form.category)) {
      setMessage({ type: 'error', text: 'Please select a valid complaint category.' });
      return;
    }
    if (!form.description || form.description.trim().length < 6) {
      setMessage({ type: 'error', text: 'Please provide a short description (min 6 characters).' });
      return;
    }

    try {
      await complaintAPI.raise({
        roomID: form.roomID,
        category: form.category,
        description: form.description,
        urgency: form.urgency
      });
      setMessage({ type: 'success', text: 'Complaint submitted' });
      setForm({ roomID: '', complaintType: 'Regular', category: 'Electricity', description: '', urgency: 'Medium' });
      fetchComplaints();
    } catch (err) {
      const text = err.response?.data?.message || err.message || 'Submit failed';
      // Provide suggestions for common errors
      let suggestion = '';
      if (text.includes('Student record not found')) {
        suggestion = ' Your student record may be missing — contact admin to link your account.';
      } else if (text.includes('Access denied')) {
        suggestion = ' You may be logged out or not a student. Please login with a student account.';
      } else if (text.includes('Failed to raise complaint')) {
        suggestion = ' There was a server error. Try again later or contact support.';
      }

      setMessage({ type: 'error', text: text + suggestion });
    }
  };

  const statusClass = (s) => s === 'Open' ? 'badge-danger' : s === 'In Progress' ? 'badge-warning' : 'badge-success';

  return (
    <div className={embedded ? 'student-complaints-inline' : 'student-complaints-page'}>
      <div className="complaints-header">
        <div>
          <h2>Raise a Complaint</h2>
          <p>Submit hostel issues and track progress without leaving the dashboard.</p>
        </div>
        {!embedded && onBackToDashboard && (
          <button className="btn btn-secondary" onClick={onBackToDashboard}>← Back to Dashboard</button>
        )}
      </div>
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
      {!embedded && (
        <div style={{ marginBottom: 8 }}>
          <button className="btn btn-secondary" onClick={fetchComplaintsRaw}>Debug: Fetch raw complaints</button>
          {debug && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <strong>Debug:</strong> {debug.loading ? 'Loading...' : debug.error ? debug.error : `Status ${debug.status}`}
              {debug.data && <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f6f8fa', padding: 8 }}>{JSON.stringify(debug.data, null, 2)}</pre>}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label>Room ID</label>
          <input value={form.roomID} onChange={(e)=>setForm({...form, roomID: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>Complaint Type</label>
          <select
            value={form.complaintType}
            onChange={(e) => {
              const complaintType = e.target.value;
              setForm({
                ...form,
                complaintType,
                category: COMPLAINT_CATEGORIES[complaintType][0]
              });
            }}
          >
            <option value="Regular">Regular Utility</option>
            <option value="Critical">Critical Complaint</option>
          </select>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})}>
            {COMPLAINT_CATEGORIES[form.complaintType].map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Urgency</label>
          <select value={form.urgency} onChange={(e)=>setForm({...form, urgency: e.target.value})}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Description</label>
          <textarea value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} rows={4} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <button className="btn btn-primary">Submit Complaint</button>
        </div>
      </form>

      <h3 style={{ marginTop: '1.5rem' }}>My Complaints</h3>
      <div className="complaints-table-wrap">
        <table className="table">
          <thead>
            <tr><th>ID</th><th>Room</th><th>Category</th><th>Status</th><th>Created</th></tr>
          </thead>
          <tbody>
            {complaints.length === 0 ? (
              <tr><td colSpan={5}>No complaints yet.</td></tr>
            ) : (
              complaints.map(c => (
                <tr key={c.complaintID}>
                  <td>{c.complaintID}</td>
                  <td>{c.roomNumber}</td>
                  <td>{c.category}</td>
                  <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
                  <td>{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StudentComplaints = () => {
  const navigate = useNavigate();

  return <StudentComplaintsContent embedded={false} onBackToDashboard={() => navigate('/student/dashboard')} />;
};

export default StudentComplaints;
