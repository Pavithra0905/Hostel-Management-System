/**
 * LOGIN PAGE
 * User login form with email and password
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Redirect based on role
        const role = result.data.role;
        const specializedCategory = result.data.specializedCategory;

        if (role === 'Admin' && specializedCategory === 'Food Issue') {
          navigate('/admin/food/dashboard');
        } else if (role === 'Admin' && specializedCategory === 'Safety') {
          navigate('/admin/safety/dashboard');
        } else if (role === 'Admin' && specializedCategory === 'Health') {
          navigate('/admin/health/dashboard');
        } else if (role === 'Admin') {
          navigate('/admin/dashboard');
        } else if (role === 'Warden') {
          navigate('/warden/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-split">
          <div className="auth-hero">
            <h3>HOSTEL MANAGEMENT SYSTEM</h3>
            <p>Manage room bookings, raise maintenance requests, and view your allocation.</p>
            <small>Secure • Reliable • Student-first</small>
          </div>

          <div className="auth-form">
            <div className="form-panel">
              <h2>LOGIN</h2>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="you@college.edu"
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="auth-link" style={{ marginTop: 12 }}>
                Don't have an account? <Link to="/register">Register here</Link>
                <div style={{ marginTop: 8 }}>
                  <Link to="/forgot-password">Forgot password?</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
