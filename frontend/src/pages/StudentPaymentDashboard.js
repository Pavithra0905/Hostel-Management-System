/**
 * STUDENT PAYMENT DASHBOARD
 * Shows payment status for current month and payment history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentAPI, leaveAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../components/Blueprint.css';

const StudentPaymentDashboard = ({ embedded = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const toAmount = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const fetchPaymentStatus = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await paymentAPI.getMyPaymentStatus();
      if (result.data.success) {
        setPaymentStatus(result.data.data);
      } else {
        setMessage({
          type: 'error',
          text: result.data.message || 'Failed to fetch payment status'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error fetching payment status'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyLeaves = useCallback(async () => {
    try {
      const result = await leaveAPI.getMyLeaves();
      if (result.data.success) {
        setMyLeaves(result.data.data || []);
      }
    } catch (error) {
      console.error('Fetch leaves error:', error);
    }
  }, []);

  useEffect(() => {
    fetchPaymentStatus();
    fetchMyLeaves();
  }, [fetchPaymentStatus, fetchMyLeaves]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();

    if (!leaveForm.fromDate || !leaveForm.toDate) {
      setMessage({ type: 'error', text: 'From date and to date are required for leave request.' });
      return;
    }

    try {
      const result = await leaveAPI.applyLeave(leaveForm);
      if (result.data.success) {
        setMessage({
          type: 'success',
          text: 'Leave request submitted. Mess concession applies only when approved leave in month is more than 7 days.'
        });
        setLeaveForm({ fromDate: '', toDate: '', reason: '' });
        fetchMyLeaves();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to submit leave request'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Full':
        return '#4CAF50';
      case 'Partial':
        return '#FF9800';
      case 'Pending':
        return '#f44336';
      case 'Overdue':
        return '#8B0000';
      default:
        return '#666';
    }
  };

  const handleGenerateReceipt = async () => {
    if (!paymentStatus) return;

    try {
      const result = await paymentAPI.generateReceipt(paymentStatus.paymentID);
      if (result.data.success) {
        setReceiptData(result.data.data);
        setShowReceipt(true);
        setMessage({
          type: 'success',
          text: 'Receipt generated successfully'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to generate receipt'
      });
    }
  };

  const handlePrintReceipt = () => {
    if (receiptData) {
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(receiptData.receiptHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: embedded ? '0' : '20px', backgroundColor: '#f5f5f5', minHeight: embedded ? 'auto' : '100vh' }}>
      {/* Header */}
      {!embedded && (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        backgroundColor: '#1976d2',
        padding: '20px',
        borderRadius: '8px',
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>💳 Payment Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Manage your hostel fees</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 10px 0' }}>Welcome, {user?.email}</p>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#d32f2f',
              border: 'none',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </div>
      )}

      {/* Message Display */}
      {message.text && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#c8e6c9' : '#ffcdd2',
          color: message.type === 'success' ? '#2e7d32' : '#c62828',
          border: `1px solid ${message.type === 'success' ? '#81c784' : '#ef5350'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
          Loading payment information...
        </div>
      ) : (
        <>
          {/* Current Payment Status Card */}
          {paymentStatus && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              marginBottom: '30px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Current Month Payment</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {/* Month */}
                <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Month</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{paymentStatus.month}</p>
                </div>

                {/* Due Date */}
                <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Due Date</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                    {new Date(paymentStatus.paymentDueDate).toLocaleDateString()}
                  </p>
                </div>

                {/* Payment Status */}
                <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Status</p>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: getStatusColor(paymentStatus.paymentStatus),
                    textTransform: 'uppercase'
                  }}>
                    {paymentStatus.paymentStatus}
                  </p>
                </div>
              </div>

              {/* Amount Details */}
              <div style={{
                backgroundColor: '#f9f9f9',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Hostel Fee</span>
                    <span>₹{toAmount(paymentStatus.feeAmount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Mess Bill (Full Month)</span>
                    <span>₹{toAmount(paymentStatus.messBillAmount).toFixed(2)}</span>
                  </div>
                  {toAmount(paymentStatus.messConcessionAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: '#2e7d32' }}>Mess Concession ({paymentStatus.leaveDaysCount} approved leave days)</span>
                      <span style={{ color: '#2e7d32' }}>-₹{toAmount(paymentStatus.messConcessionAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span><strong>Net Mess Bill ({paymentStatus.effectiveMessDays ?? 0} days)</strong></span>
                    <span><strong>₹{toAmount(paymentStatus.netMessBillAmount).toFixed(2)}</strong></span>
                  </div>
                  {toAmount(paymentStatus.fineAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: '#d32f2f' }}>Late Payment Fine</span>
                      <span style={{ color: '#d32f2f' }}>₹{toAmount(paymentStatus.fineAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                    <span>Total Amount Due</span>
                    <span style={{ color: '#1976d2' }}>₹{toAmount(paymentStatus.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Amount Paid</span>
                    <span style={{ color: '#4CAF50' }}>₹{toAmount(paymentStatus.paidAmount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: '#d32f2f' }}>
                    <span>Outstanding Amount</span>
                    <span>₹{(toAmount(paymentStatus.totalAmount) - toAmount(paymentStatus.paidAmount)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              {paymentStatus.paymentMethod && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                  <strong>Payment Method:</strong> {paymentStatus.paymentMethod}
                </div>
              )}

              {/* Receipt Number */}
              {paymentStatus.receiptNumber && (
                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                  <strong>Receipt #:</strong> {paymentStatus.receiptNumber}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={handleGenerateReceipt}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  📄 Generate Receipt
                </button>
                {paymentStatus.paymentStatus !== 'Full' && (
                  <button
                    onClick={() => navigate('/student/payment-history')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    📋 Payment History
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>📝 Leave For Mess Concession</h2>
            <p style={{ marginTop: 0, color: '#666' }}>
              Rule: If approved leave days in a month are more than 7, mess bill for those leave days is waived.
            </p>

            <form onSubmit={handleApplyLeave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>From Date</label>
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>To Date</label>
                <input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, toDate: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Reason</label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Optional reason"
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '220px',
                  padding: '12px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Submit Leave Request
              </button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>From</th>
                    <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>To</th>
                    <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Days</th>
                    <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map((leave) => (
                    <tr key={leave.leaveID}>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{new Date(leave.fromDate).toLocaleDateString()}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{new Date(leave.toDate).toLocaleDateString()}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{leave.totalDays}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{leave.status}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{leave.adminRemarks || '-'}</td>
                    </tr>
                  ))}
                  {myLeaves.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '12px', color: '#666' }}>No leave requests submitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receipt Modal */}
          {showReceipt && receiptData && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'relative'
              }}>
                <button
                  onClick={() => setShowReceipt(false)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    fontSize: '20px'
                  }}
                >
                  ✕
                </button>

                <div dangerouslySetInnerHTML={{ __html: receiptData.receiptHTML }} style={{ padding: '20px' }} />

                <div style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid #e0e0e0' }}>
                  <button
                    onClick={handlePrintReceipt}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    🖨️ Print Receipt
                  </button>
                  <button
                    onClick={() => setShowReceipt(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#757575',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentPaymentDashboard;
