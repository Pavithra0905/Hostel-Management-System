/**
 * REGISTER PAGE
 * User registration form with role-based fields
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Student',
    regNo: '',
    isExService: false,
    isCurrentStaff: false,
    adminSpecialization: '',
    name: '',
    year: 'First',
    department: '',
    phoneNumber: '',
    guardianContact: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate mutual exclusion for student category fields
    if (formData.role === 'Student' && formData.isExService && formData.isCurrentStaff) {
      setError('Cannot select both Ex-Service and Current Staff options');
      return;
    }

    if (formData.role === 'Student' && !formData.regNo.trim()) {
      setError('Register Number is required for student registration');
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        // Redirect based on role
        if (result.data.role === 'Student') {
          navigate('/student/dashboard');
        } else if (result.data.role === 'Admin' && result.data.specializedCategory === 'Food Issue') {
          navigate('/admin/food/dashboard');
        } else if (result.data.role === 'Admin' && result.data.specializedCategory === 'Safety') {
          navigate('/admin/safety/dashboard');
        } else if (result.data.role === 'Admin' && result.data.specializedCategory === 'Health') {
          navigate('/admin/health/dashboard');
        } else {
          navigate('/admin/dashboard');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
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
            <p>Create your account to request rooms, report issues and track allocations.</p>
          </div>

          <div className="auth-form">
            <div className="form-panel">
              <h2>REGISTRATION</h2>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Min 8 chars, 1 digit, 1 special char"
                  />
                </div>

                <div className="form-group">
                  <label>Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Re-enter password"
                  />
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                  >
                    <option value="Student">Student</option>
                    <option value="Warden">Warden</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                {formData.role === 'Admin' && (
                  <div className="form-group">
                    <label>Critical Admin Specialization (Optional)</label>
                    <select
                      name="adminSpecialization"
                      value={formData.adminSpecialization}
                      onChange={handleChange}
                    >
                      <option value="">General Admin (no specialization)</option>
                      <option value="Food Issue">Food Issue Admin</option>
                      <option value="Safety">Safety Admin</option>
                      <option value="Health">Health Admin</option>
                    </select>
                  </div>
                )}

                {formData.role === 'Student' && (
                  <>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          name="isExService"
                          checked={formData.isExService}
                          onChange={handleChange}
                          disabled={formData.isCurrentStaff}
                        />
                        Ex-Service Staff / Dependent
                      </label>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          name="isCurrentStaff"
                          checked={formData.isCurrentStaff}
                          onChange={handleChange}
                          disabled={formData.isExService}
                        />
                        Current Staff (50% Discount)
                      </label>
                    </div>

                    <div className="form-group">
                      <label>Register Number *</label>
                      <input
                        type="text"
                        name="regNo"
                        value={formData.regNo}
                        onChange={handleChange}
                        required={formData.role === 'Student'}
                        placeholder="Enter your register number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Academic Year *</label>
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        required
                      >
                        <option value="First">First Year</option>
                        <option value="Second">Second Year</option>
                        <option value="Third">Third Year</option>
                        <option value="Final">Final Year</option>
                        <option value="PhD">PhD Scholar</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Department</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="e.g., Computer Science"
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="form-group">
                      <label>Guardian Contact</label>
                      <input
                        type="tel"
                        name="guardianContact"
                        value={formData.guardianContact}
                        onChange={handleChange}
                        placeholder="Enter guardian contact"
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </form>

              <div className="auth-link">
                Already have an account? <Link to="/login">Login here</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
