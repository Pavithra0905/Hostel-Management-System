import React, { useState } from 'react';
import { safetyAPI } from '../services/api';

const DEFAULT_CAMPUS_COORDS = {
  latitude: 12.9716,
  longitude: 77.5946
};

const randomNearCampus = () => {
  const offsetLat = (Math.random() - 0.5) * 0.01;
  const offsetLon = (Math.random() - 0.5) * 0.01;

  return {
    latitude: Number((DEFAULT_CAMPUS_COORDS.latitude + offsetLat).toFixed(7)),
    longitude: Number((DEFAULT_CAMPUS_COORDS.longitude + offsetLon).toFixed(7))
  };
};

const LocationTracker = ({ studentID, onLocationUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [message, setMessage] = useState('');

  const sendLocation = async (coords) => {
    setLoading(true);
    try {
      const payload = {
        studentID,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString()
      };

      const response = await safetyAPI.updateLocation(payload);
      const data = response.data.data;

      setLastLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        status: data.isInsideSafeZone ? 'Safe' : 'Unsafe'
      });

      setMessage(response.data.message);

      if (onLocationUpdated) {
        onLocationUpdated(data);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocation({
            latitude: Number(position.coords.latitude.toFixed(7)),
            longitude: Number(position.coords.longitude.toFixed(7))
          });
        },
        () => {
          // If browser denies GPS, simulate a location near campus for demo.
          sendLocation(randomNearCampus());
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
      return;
    }

    sendLocation(randomNearCampus());
  };

  return (
    <div className="safety-card mobile-card">
      <h3>Live Location Tracker</h3>
      <p className="safety-muted">Tap to send your latest GPS position to hostel safety team.</p>

      <button
        type="button"
        className="btn-primary"
        onClick={handleTrackLocation}
        disabled={loading}
      >
        {loading ? 'Sending Location...' : 'Share Live Location'}
      </button>

      {message && <p className="safety-message">{message}</p>}

      {lastLocation && (
        <div className="location-chip-wrap">
          <div className="location-chip">Latitude: {lastLocation.latitude}</div>
          <div className="location-chip">Longitude: {lastLocation.longitude}</div>
          <div className={`status-pill ${lastLocation.status === 'Safe' ? 'safe' : 'unsafe'}`}>
            {lastLocation.status}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;
