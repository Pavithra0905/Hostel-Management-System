/**
 * ADMIN PAYMENT MANAGEMENT
 * Admin dashboard for managing student payments
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentAPI, leaveAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminPaymentManagement = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({
    status: '',
    month: new Date().toISOString().slice(0, 7),
    limit: 50,
    offset: 0
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentID: '',
    amountPaid: '',
    paymentMethod: 'Online Transfer',
    remarks: ''
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('Pending');

  const fetchPaymentSummary = useCallback(async () => {
    setLoading(true);
    try {
      const result = await paymentAPI.getPaymentSummary();
      if (result.data.success) {
        setSummary(result.data.data);
        setMessage({ type: '', text: '' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error fetching payment summary'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllPayments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await paymentAPI.getAllStudentsPayments({
        status: filters.status,
        month: filters.month,
        limit: filters.limit,
        offset: filters.offset
      });

      if (result.data.success) {
        setPayments(result.data.data.payments);
        setPagination({
          total: result.data.data.total,
          limit: result.data.data.limit,
          offset: result.data.data.offset
        });
        setMessage({ type: '', text: '' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error fetching payments'
      });
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.month, filters.limit, filters.offset]);

  const fetchAllLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const result = await leaveAPI.getAllLeaves({ status: leaveStatusFilter || undefined });
      if (result.data.success) {
        setLeaveRequests(result.data.data || []);
        setMessage({ type: '', text: '' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error fetching leave requests'
      });
    } finally {
      setLoading(false);
    }
  }, [leaveStatusFilter]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchPaymentSummary();
    } else if (activeTab === 'manage') {
      fetchAllPayments();
    } else if (activeTab === 'leaves') {
      fetchAllLeaves();
    }
  }, [activeTab, fetchPaymentSummary, fetchAllPayments, fetchAllLeaves]);

  const handleUpdateLeaveStatus = async (leaveID, status) => {
    try {
      const result = await leaveAPI.updateLeaveStatus(leaveID, { status });
      if (result.data.success) {
        setMessage({ type: 'success', text: `Leave request ${status.toLowerCase()} successfully.` });
        fetchAllLeaves();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update leave request'
      });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();

    if (!paymentForm.paymentID || !paymentForm.amountPaid) {
      setMessage({
        type: 'error',
        text: 'Please fill in all required fields'
      });
      return;
    }

    try {
      const result = await paymentAPI.recordPayment({
        paymentID: parseInt(paymentForm.paymentID),
        amountPaid: parseFloat(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        remarks: paymentForm.remarks
      });

      if (result.data.success) {
        setMessage({
          type: 'success',
          text: `Payment recorded successfully! Receipt: ${result.data.data.receiptNumber}`
        });
        setPaymentForm({ paymentID: '', amountPaid: '', paymentMethod: 'Online Transfer', remarks: '' });
        fetchAllPayments();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to record payment'
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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

  const handlePreviousPage = () => {
    if (filters.offset > 0) {
      setFilters(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }));
    }
  };

  const handleNextPage = () => {
    if (filters.offset + filters.limit < pagination.total) {
      setFilters(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
  };

  const currentPage = filters.offset / filters.limit + 1;
  const totalPages = Math.ceil(pagination.total / filters.limit);
  const toAmount = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

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
          <h1 style={{ margin: 0, fontSize: '28px' }}>💳 Payment Management</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Manage hostel fee payments</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 10px 0' }}>Role: {user?.role}</p>
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

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'overview' ? '#1976d2' : 'white',
            color: activeTab === 'overview' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'manage' ? '#1976d2' : 'white',
            color: activeTab === 'manage' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📋 Manage Payments
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'leaves' ? '#1976d2' : 'white',
            color: activeTab === 'leaves' ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📝 Leave Approvals
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
          Loading...
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && summary && (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                {/* Total Students */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #1976d2'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Total Students</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1976d2' }}>
                    {summary.summary?.totalStudents || 0}
                  </p>
                </div>

                {/* Paid Students */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #4CAF50'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Fully Paid</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
                    {summary.summary?.paidStudents || 0}
                  </p>
                </div>

                {/* Partial Paid */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #FF9800'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Partially Paid</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#FF9800' }}>
                    {summary.summary?.partialPaidStudents || 0}
                  </p>
                </div>

                {/* Unpaid */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #f44336'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Unpaid/Overdue</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#f44336' }}>
                    {summary.summary?.unpaidStudents || 0}
                  </p>
                </div>

                {/* Total Due */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #9C27B0'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Total Due</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#9C27B0' }}>
                    ₹{toAmount(summary.summary?.totalDue).toFixed(2)}
                  </p>
                </div>

                {/* Total Collected */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  borderLeft: '4px solid #00BCD4'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Collected</p>
                  <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#00BCD4' }}>
                    ₹{toAmount(summary.summary?.totalCollected).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Status Distribution */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>Payment Status Distribution</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  {summary.statusDistribution?.map((status, index) => (
                    <div key={index} style={{
                      padding: '15px',
                      backgroundColor: getStatusBgColor(status.paymentStatus),
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}>
                      <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: getStatusColor(status.paymentStatus) }}>
                        {status.paymentStatus}
                      </p>
                      <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
                        {status.count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manage Payments Tab */}
          {activeTab === 'manage' && (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                {/* Filters */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Filters</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Month</label>
                    <input
                      type="month"
                      value={filters.month}
                      onChange={(e) => setFilters({ ...filters, month: e.target.value, offset: 0 })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value, offset: 0 })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">All Status</option>
                      <option value="Full">Full</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                {/* Record Payment Form */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Record Payment</h3>
                  <form onSubmit={handleRecordPayment}>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Payment ID *</label>
                      <input
                        type="number"
                        value={paymentForm.paymentID}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentID: e.target.value })}
                        placeholder="Enter Payment ID"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Amount Paid *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.amountPaid}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                        placeholder="Enter amount"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Payment Method</label>
                      <select
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Online Transfer">Online Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>Remarks</label>
                      <textarea
                        value={paymentForm.remarks}
                        onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                        placeholder="Optional remarks"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                          minHeight: '60px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Record Payment
                    </button>
                  </form>
                </div>
              </div>

              {/* Payments Table */}
              {payments.length > 0 ? (
                <>
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
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Student</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Month</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Total Due</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Paid</th>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '15px', color: '#333' }}>
                              <div><strong>{payment.studentName}</strong></div>
                              <div style={{ fontSize: '12px', color: '#999' }}>{payment.year} Year</div>
                            </td>
                            <td style={{ padding: '15px', color: '#333' }}>{payment.month}</td>
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
                      onClick={handlePreviousPage}
                      disabled={filters.offset === 0}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: filters.offset === 0 ? '#ccc' : '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: filters.offset === 0 ? 'not-allowed' : 'pointer'
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
                      onClick={handleNextPage}
                      disabled={filters.offset + filters.limit >= pagination.total}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: filters.offset + filters.limit >= pagination.total ? '#ccc' : '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: filters.offset + filters.limit >= pagination.total ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </>
              ) : (
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <p style={{ fontSize: '18px', color: '#999', margin: 0 }}>No payment records found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaves' && (
            <div>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Filter by status</label>
                <select
                  value={leaveStatusFilter}
                  onChange={(e) => setLeaveStatusFilter(e.target.value)}
                  style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Leave Period</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Days</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Reason</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((leave) => (
                      <tr key={leave.leaveID} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                          <div><strong>{leave.studentName}</strong></div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{leave.regNo} • {leave.email}</div>
                        </td>
                        <td style={{ padding: '12px' }}>{new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}</td>
                        <td style={{ padding: '12px' }}>{leave.totalDays}</td>
                        <td style={{ padding: '12px' }}>{leave.status}</td>
                        <td style={{ padding: '12px' }}>{leave.reason || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          {leave.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleUpdateLeaveStatus(leave.leaveID, 'Approved')}
                                style={{ padding: '6px 10px', border: 'none', borderRadius: '4px', backgroundColor: '#4CAF50', color: 'white', cursor: 'pointer' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateLeaveStatus(leave.leaveID, 'Rejected')}
                                style={{ padding: '6px 10px', border: 'none', borderRadius: '4px', backgroundColor: '#f44336', color: 'white', cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#666' }}>No action</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leaveRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                          No leave requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPaymentManagement;
