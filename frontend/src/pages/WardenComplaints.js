import React, { useEffect, useState } from 'react';
import { complaintAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const CRITICAL_DESK_MAP = {
  'Food Issue': 'Food Admin Desk',
  'Safety': 'Safety Admin Desk',
  'Health': 'Health Admin Desk'
};

const WardenComplaints = ({ embedded = false }) => {
  const [complaints, setComplaints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [assignTo, setAssignTo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const fetchAll = async () => {
    try {
      const res = await complaintAPI.allComplaints();
      setComplaints(res.data.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load complaints' });
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAssign = async () => {
    if (!selected) return;
    try {
      await complaintAPI.assign(selected.complaintID, { assignedTo: assignTo, remarks });
      setMessage({ type: 'success', text: 'Assigned' });
      setAssignTo(''); setRemarks(''); setSelected(null);
      fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Assign failed' });
    }
  };

  const handleResolve = async (id) => {
    try {
      await complaintAPI.resolve(id, { remarks });
      setMessage({ type: 'success', text: 'Marked resolved' });
      fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Resolve failed' });
    }
  };

  const statusClass = (s) => s === 'Open' ? 'badge-danger' : s === 'In Progress' ? 'badge-warning' : 'badge-success';

  return (
    <div className={embedded ? '' : 'page-card center-panel'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginTop: embedded ? 0 : undefined }}>All Complaints (Warden/Admin)</h2>
        {!embedded && (
          <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>← Back to Dashboard</button>
        )}
      </div>
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <table className="table">
        <thead>
          <tr><th>ID</th><th>Student</th><th>Room</th><th>Category</th><th>Handling Desk</th><th>Status</th><th>Created</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {complaints.map(c => (
            <tr
              key={c.complaintID}
              onClick={() => {
                setSelected(c);
                setAssignTo(c.handlingDesk || CRITICAL_DESK_MAP[c.category] || '');
              }}
              style={{ cursor: 'pointer' }}
            >
              <td>{c.complaintID}</td>
              <td>{c.studentName} ({c.studentEmail})</td>
              <td>{c.roomNumber}</td>
              <td>{c.category}</td>
              <td>{c.handlingDesk || CRITICAL_DESK_MAP[c.category] || 'Maintenance/Admin Staff'}</td>
              <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
              <td>{new Date(c.createdAt).toLocaleString()}</td>
              <td>
                <button className="btn btn-sm" onClick={(e)=>{e.stopPropagation(); handleResolve(c.complaintID);}}>Resolve</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <h4>Selected Complaint #{selected.complaintID}</h4>
          <p><strong>Category:</strong> {selected.category}</p>
          <p><strong>Handling Desk:</strong> {selected.handlingDesk || CRITICAL_DESK_MAP[selected.category] || 'Maintenance/Admin Staff'}</p>
          <p><strong>Description:</strong> {selected.description}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Assign to (staff name)" value={assignTo} onChange={e=>setAssignTo(e.target.value)} />
            <input placeholder="Remarks" value={remarks} onChange={e=>setRemarks(e.target.value)} />
            <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
            <button className="btn" onClick={()=>setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardenComplaints;
