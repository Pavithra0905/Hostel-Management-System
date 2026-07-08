import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import '../components/SafetyTracking.css';

const StudentFineDashboard = ({ embedded = false }) => {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('movements');
  const [expectedInTime, setExpectedInTime] = useState('');
  const [reportingOut, setReportingOut] = useState(false);

  const API_URL = 'http://localhost:5000/api';

  const toArray = (value) => (Array.isArray(value) ? value : []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch movements
      const movRes = await axios.get(`${API_URL}/fines/movements/mine`, { headers });
      setMovements(toArray(movRes?.data?.data));

      // Fetch fines
      const finRes = await axios.get(`${API_URL}/fines/mine`, { headers });
      const finePayload = finRes?.data?.data;
      setFines(toArray(finePayload?.fines));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load fine data');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportOut = async (e) => {
    e.preventDefault();
    if (!expectedInTime) {
      alert('Please select expected in time');
      return;
    }

    setReportingOut(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/fines/report-out`,
        {
          expectedInDateTime: new Date(expectedInTime).toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setExpectedInTime('');
      alert('Out time reported successfully');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to report out time');
    } finally {
      setReportingOut(false);
    }
  };

  const handleReportIn = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/fines/report-in`,
        { studentID: user.studentID },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('In time reported successfully');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to report in time');
    } finally {
      setLoading(false);
    }
  };

  const getTotalFines = () => {
    return fines.reduce((sum, fine) => sum + (Number(fine.fineAmount) || 0), 0);
  };

  const getPendingFines = () => {
    return fines.filter(f => f.status === 'Pending').length;
  };

  const getFineColor = (amount) => {
    if (amount === 0) return '#4CAF50';
    if (amount <= 100) return '#FFC107';
    if (amount <= 500) return '#FF9800';
    if (amount <= 1000) return '#FF5722';
    return '#D32F2F';
  };

  const hasActiveOutEntry = movements.some((m) => m.status === 'Out');

  const statusBadge = (status) => {
    const colors = {
      'Out': '#FFC107',
      'Returned': '#4CAF50',
      'No Report': '#D32F2F'
    };
    return <span style={{ background: colors[status] || '#999', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{status}</span>;
  };

  if (loading && movements.length === 0 && fines.length === 0) {
    return <div style={{ padding: '20px' }}>Loading fine dashboard...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: embedded ? '0' : '0 auto', padding: embedded ? '0' : '20px' }}>
      <h2>📋 Fine & In/Out Time Dashboard</h2>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#1976d2' }}>Total Fines</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1976d2' }}>₹{getTotalFines()}</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#f57c00' }}>Pending Fines</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f57c00' }}>{getPendingFines()}</div>
        </div>
        <div style={{ background: '#f3e5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#7b1fa2' }}>Total Movements</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7b1fa2' }}>{movements.length}</div>
        </div>
      </div>

      {/* Report Out-Time Form */}
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>📤 Report Out Time</h3>
        <form onSubmit={handleReportOut} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <label>Expected In Time:</label>
            <input
              type="datetime-local"
              value={expectedInTime}
              onChange={(e) => setExpectedInTime(e.target.value)}
              required
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '250px' }}
            />
          </div>
          <button
            type="submit"
            disabled={reportingOut}
            style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: reportingOut ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-end'
            }}
          >
            {reportingOut ? 'Reporting...' : 'Report Out'}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #ddd', marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <button
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '10px 15px',
            background: activeTab === 'movements' ? '#1976d2' : 'transparent',
            color: activeTab === 'movements' ? '#fff' : '#666',
            border: 'none',
            borderBottom: activeTab === 'movements' ? '3px solid #1976d2' : 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'movements' ? 'bold' : 'normal'
          }}
        >
          📍 My Movements ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('fines')}
          style={{
            padding: '10px 15px',
            background: activeTab === 'fines' ? '#1976d2' : 'transparent',
            color: activeTab === 'fines' ? '#fff' : '#666',
            border: 'none',
            borderBottom: activeTab === 'fines' ? '3px solid #1976d2' : 'none',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'fines' ? 'bold' : 'normal'
          }}
        >
          💰 My Fines ({fines.length})
        </button>
      </div>

      {/* Movements Table */}
      {activeTab === 'movements' && (
        <div style={{ overflowX: 'auto' }}>
          <h3>In/Out Time Records</h3>
          {movements.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No movements recorded yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead style={{ background: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Out Time</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Expected In</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>In Time</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Late (hrs)</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Fine (₹)</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.movementID} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {new Date(m.outDateTime).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {new Date(m.expectedInDateTime).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {m.actualInDateTime ? new Date(m.actualInDateTime).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                      {statusBadge(m.status)}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                      {m.hoursLate || 0}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: getFineColor(m.fineAmount) }}>
                      ₹{m.fineAmount || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            onClick={handleReportIn}
            disabled={!hasActiveOutEntry}
            style={{
              marginTop: '15px',
              padding: '12px 25px',
              background: hasActiveOutEntry ? '#2196F3' : '#90caf9',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: hasActiveOutEntry ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📥 Report In Time
          </button>
          {!hasActiveOutEntry && (
            <div style={{ marginTop: '8px', color: '#666', fontSize: '13px' }}>
              Report out time first. Then this button will submit your in-time.
            </div>
          )}
        </div>
      )}

      {/* Fines Table */}
      {activeTab === 'fines' && (
        <div style={{ overflowX: 'auto' }}>
          <h3>Fine History</h3>
          {fines.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No fines recorded</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead style={{ background: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Hours Late</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right' }}>Fine Amount</th>
                  <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.fineID} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {new Date(f.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                      {f.hoursLate}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: getFineColor(f.fineAmount) }}>
                      ₹{f.fineAmount}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <span style={{
                        background: f.status === 'Paid' ? '#4CAF50' : '#FF9800',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Fine Scale Reference */}
      <div style={{ background: '#f0f4f8', padding: '20px', borderRadius: '8px', marginTop: '30px', borderLeft: '4px solid #1976d2' }}>
        <h3>📊 Fine Scale</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>✅ Up to 1 hour late → <strong>₹100</strong></div>
          <div>⚠️ 1-2 hours late → <strong>₹500</strong></div>
          <div>🚨 2-3 hours late → <strong>₹1000</strong></div>
          <div>❌ More than 3 hours late → <strong>₹5000</strong></div>
        </div>
      </div>
    </div>
  );
};

export default StudentFineDashboard;
