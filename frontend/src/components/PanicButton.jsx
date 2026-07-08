import React, { useState } from 'react';
import { safetyAPI } from '../services/api';

const PanicButton = ({ studentID }) => {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handlePanic = async () => {
    setSubmitting(true);

    try {
      let latitude = null;
      let longitude = null;

      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              latitude = Number(position.coords.latitude.toFixed(7));
              longitude = Number(position.coords.longitude.toFixed(7));
              resolve();
            },
            () => resolve(),
            { timeout: 4000 }
          );
        });
      }

      const payload = {
        studentID,
        message: 'Emergency! Immediate assistance required.',
        location: latitude && longitude ? `${latitude}, ${longitude}` : 'Location unavailable',
        latitude,
        longitude
      };

      const response = await safetyAPI.createEmergencyAlert(payload);
      setMessage(`Alert sent successfully. Alert ID: ${response.data.data.alertID}`);
      alert('Emergency alert sent to admin/warden.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to send emergency alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="safety-card mobile-card">
      <h3>Emergency Panic Button</h3>
      <p className="safety-muted">Use only during emergency situations.</p>

      <button
        type="button"
        className="panic-button"
        onClick={handlePanic}
        disabled={submitting}
      >
        {submitting ? 'Sending SOS...' : 'PANIC / SOS'}
      </button>

      {message && <p className="safety-message">{message}</p>}
    </div>
  );
};

export default PanicButton;
