/**
 * STUDENT ALLOCATION HISTORY PAGE
 * Shows allocation history for the logged-in student
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { allocationAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const AllocationHistoryContent = ({ embedded = false, onBackToDashboard }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await allocationAPI.getAllocationHistory();
      setHistory(response.data.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'badge-success';
      case 'Cancelled':
        return 'badge-danger';
      case 'Completed':
        return 'badge-info';
      default:
        return 'badge-warning';
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
    <div className={embedded ? 'student-history-inline' : 'student-history-page'}>
      <div className="history-header">
        <div>
          <h2>Allocation History</h2>
          <p>Track your room allocation timeline from one place.</p>
        </div>
        {!embedded && onBackToDashboard && (
          <button className="btn btn-secondary" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        )}
      </div>

      <div className="history-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Room Number</th>
              <th>Type</th>
              <th>Block</th>
              <th>Allocated Date</th>
              <th>Release Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  No allocation history found
                </td>
              </tr>
            ) : (
              history.map(item => (
                <tr key={item.allocationID}>
                  <td>{item.roomNumber}</td>
                  <td>{item.type}</td>
                  <td>{item.hostelBlock}</td>
                  <td>{new Date(item.allocatedDate).toLocaleDateString()}</td>
                  <td>
                    {item.releaseDate
                      ? new Date(item.releaseDate).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AllocationHistory = () => {
  const navigate = useNavigate();

  return <AllocationHistoryContent embedded={false} onBackToDashboard={() => navigate('/student/dashboard')} />;
};

export default AllocationHistory;
