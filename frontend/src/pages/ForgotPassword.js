import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await authAPI.forgotPassword({ email });
      if (res.data && res.data.success) {
        setMessage(res.data.message || 'If the email exists, a reset link was sent.');
        // In development the API returns resetToken; show it so developer can test
        if (res.data.resetToken) setMessage((m) => `${m}\nTest token: ${res.data.resetToken}`);
      } else {
        setError(res.data?.message || 'Request failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-split">
        <div className="auth-hero">
          <h3>Forgot Password</h3>
          <p>Enter your account email and we'll send a reset token (development only).</p>
        </div>

        <div className="auth-form">
          <h2>Reset your password</h2>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success" style={{ whiteSpace: 'pre-wrap' }}>{message}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@college.edu"
              />
            </div>

            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="auth-link" style={{ marginTop: 12 }}>
            Remembered? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
