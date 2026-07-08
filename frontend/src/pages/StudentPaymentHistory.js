/**
 * STUDENT PAYMENT HISTORY
 * Shows all historical payments for a student
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const StudentPaymentHistory = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pagination, setPagination] = useState({
    limit: 12,
    offset: 0,
    total: 0
  });
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const toAmount = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const fetchPaymentHistory = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await paymentAPI.getMyPaymentHistory({
        limit: pagination.limit,
        offset: pagination.offset
      });

      if (result.data.success) {
        setPayments(result.data.data.payments);
        setPagination(prev => ({
          ...prev,
          total: result.data.data.total
        }));
      } else {
        setMessage({
          type: 'error',
          text: result.data.message || 'Failed to fetch payment history'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error fetching payment history'
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [pagination.offset, fetchPaymentHistory]);

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

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'Full':
        return '#e8f5e9';
      case 'Partial':
        return '#fff3e0';
      case 'Pending':
        return '#ffebee';
      case 'Overdue':
        return '#ffcdd2';
      default:
        return '#f5f5f5';
    }
  };

  const handleGenerateReceipt = async (paymentID) => {
    try {
      const result = await paymentAPI.generateReceipt(paymentID);
      if (result.data.success) {
        setReceiptData(result.data.data);
        setShowReceipt(true);
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

  const handleDownloadReceipt = () => {
    if (receiptData) {
      const element = document.createElement('a');
      const file = new Blob([receiptData.receiptHTML], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = `Receipt-${receiptData.receiptNumber}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePrevious = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }));
    }
  };

  const handleNext = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  const currentPage = pagination.offset / pagination.limit + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
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
          <h1 style={{ margin: 0, fontSize: '28px' }}>📋 Payment History</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>View all your hostel fee payments</p>
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

      {/* Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/student/dashboard')}
          style={{
            padding: '10px 16px',
            backgroundColor: '#757575',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
          Loading payment history...
        </div>
      ) : payments.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '18px', color: '#999', margin: 0 }}>No payment records found.</p>
        </div>
      ) : (
        <>
          {/* Payment Summary Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999' }}>Total Payments</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>{pagination.total}</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999' }}>Showing</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                  {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Month</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Fee</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Fine</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Total Due</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Paid</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#333' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', color: '#333' }}>{payment.month}</td>
                    <td style={{ padding: '15px', color: '#333' }}>₹{toAmount(payment.feeAmount).toFixed(2)}</td>
                    <td style={{ padding: '15px', color: toAmount(payment.fineAmount) > 0 ? '#d32f2f' : '#999' }}>
                      ₹{toAmount(payment.fineAmount).toFixed(2)}
                    </td>
                    <td style={{ padding: '15px', color: '#333', fontWeight: 'bold' }}>₹{toAmount(payment.totalAmount).toFixed(2)}</td>
                    <td style={{ padding: '15px', color: '#4CAF50', fontWeight: 'bold' }}>₹{toAmount(payment.paidAmount).toFixed(2)}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '5px 12px',
                        borderRadius: '4px',
                        backgroundColor: getStatusBgColor(payment.paymentStatus),
                        color: getStatusColor(payment.paymentStatus),
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {payment.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleGenerateReceipt(payment.paymentID)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#1976d2',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📄 Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              onClick={handlePrevious}
              disabled={pagination.offset === 0}
              style={{
                padding: '10px 16px',
                backgroundColor: pagination.offset === 0 ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: pagination.offset === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            <span style={{ 
              padding: '10px 16px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              style={{
                padding: '10px 16px',
                backgroundColor: pagination.offset + pagination.limit >= pagination.total ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: pagination.offset + pagination.limit >= pagination.total ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        </>
      )}

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
                fontSize: '20px',
                zIndex: 1
              }}
            >
              ✕
            </button>

            <div dangerouslySetInnerHTML={{ __html: receiptData.receiptHTML }} style={{ padding: '20px' }} />

            <div style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handlePrintReceipt}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                🖨️ Print
              </button>
              <button
                onClick={handleDownloadReceipt}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ⬇️ Download
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
    </div>
  );
};

export default StudentPaymentHistory;
