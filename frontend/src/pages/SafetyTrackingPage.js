import React from 'react';
import { useAuth } from '../context/AuthContext';
import LocationTracker from '../components/LocationTracker';
import PanicButton from '../components/PanicButton';
import SafetyDashboard from '../components/SafetyDashboard';
import '../components/SafetyTracking.css';

const SafetyTrackingPage = () => {
  const { user } = useAuth();

  const studentID = user?.studentID || null;
  const isAdminView = user?.role === 'Admin' || user?.role === 'Warden';

  return (
    <div className="safety-page">
      <h2>Safety Tracking Module</h2>
      <p className="safety-subtitle">
        Real-time location, panic alerts, and hostel safety analytics.
      </p>

      {isAdminView ? (
        <SafetyDashboard />
      ) : (
        <div className="mobile-layout">
          <LocationTracker studentID={studentID} />
          <PanicButton studentID={studentID} />
        </div>
      )}
    </div>
  );
};

export default SafetyTrackingPage;
