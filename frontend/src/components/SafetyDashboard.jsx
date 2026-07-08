import React, { useEffect, useMemo, useState } from 'react';
import { safetyAPI } from '../services/api';

const SafetyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [riskAreas, setRiskAreas] = useState([]);
  const [trends, setTrends] = useState([]);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        alertsRes,
        locationsRes,
        incidentsRes,
        riskAreasRes,
        trendsRes
      ] = await Promise.all([
        safetyAPI.getSafetyMetrics(),
        safetyAPI.getEmergencyAlerts(),
        safetyAPI.getAllLatestLocations(),
        safetyAPI.getRecentIncidents(),
        safetyAPI.getHighRiskAreas(),
        safetyAPI.getIncidentTrends({ days: 30 })
      ]);

      setMetrics(metricsRes.data.data);
      setAlerts(alertsRes.data.data || []);
      setLocations(locationsRes.data.data || []);
      setIncidents(incidentsRes.data.data || []);
      setRiskAreas(riskAreasRes.data.data || []);
      setTrends(trendsRes.data.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load safety dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const normalizedMapMarkers = useMemo(() => {
    if (!locations.length) return [];

    const latitudes = locations.map((item) => Number(item.latitude));
    const longitudes = locations.map((item) => Number(item.longitude));

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    return locations.map((item) => {
      const lat = Number(item.latitude);
      const lon = Number(item.longitude);

      const x = maxLon === minLon ? 50 : ((lon - minLon) / (maxLon - minLon)) * 100;
      const y = maxLat === minLat ? 50 : 100 - ((lat - minLat) / (maxLat - minLat)) * 100;

      return {
        ...item,
        x,
        y
      };
    });
  }, [locations]);

  const handleResolveAlert = async (alertID) => {
    try {
      await safetyAPI.resolveEmergencyAlert(alertID);
      await loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve alert');
    }
  };

  const handleExport = async (type) => {
    try {
      const response = await safetyAPI.exportSafetyReport(type);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', type === 'incidents' ? 'safety_incidents.csv' : 'safety_alerts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Export failed');
    }
  };

  if (loading) {
    return <div className="safety-loading">Loading safety dashboard...</div>;
  }

  return (
    <div className="safety-dashboard-grid">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="safety-card">
        <h3>Safety Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-box">
            <span>Total Alerts</span>
            <strong>{metrics?.totalAlerts || 0}</strong>
          </div>
          <div className="metric-box">
            <span>Avg Response (min)</span>
            <strong>{metrics?.averageResponseTimeMinutes || 0}</strong>
          </div>
          <div className="metric-box">
            <span>Unsafe Students</span>
            <strong>{locations.filter((x) => !x.isInsideSafeZone).length}</strong>
          </div>
        </div>
      </div>

      <div className="safety-card">
        <div className="safety-card-head">
          <h3>Emergency Alerts</h3>
          <div>
            <button type="button" className="btn-secondary" onClick={() => handleExport('alerts')}>
              Export Alerts CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Message</th>
                <th>Status</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.slice(0, 8).map((alertItem) => (
                <tr key={alertItem.id}>
                  <td>{alertItem.studentName}</td>
                  <td>{alertItem.message}</td>
                  <td>
                    <span className={`status-pill ${alertItem.status === 'resolved' ? 'safe' : 'unsafe'}`}>
                      {alertItem.status}
                    </span>
                  </td>
                  <td>{new Date(alertItem.timestamp).toLocaleString()}</td>
                  <td>
                    {alertItem.status !== 'resolved' && (
                      <button type="button" className="btn-primary" onClick={() => handleResolveAlert(alertItem.id)}>
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="safety-card">
        <h3>Student Location Status</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td>{loc.studentName}</td>
                  <td>
                    <span className={`status-pill ${loc.isInsideSafeZone ? 'safe' : 'unsafe'}`}>
                      {loc.isInsideSafeZone ? 'Safe' : 'Unsafe'}
                    </span>
                  </td>
                  <td>{loc.latitude}, {loc.longitude}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="safety-card">
        <h3>Basic Map View</h3>
        <div className="simple-map">
          {normalizedMapMarkers.map((marker) => (
            <div
              key={marker.id}
              className={`marker ${marker.isInsideSafeZone ? 'safe' : 'unsafe'}`}
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              title={`${marker.studentName}: ${marker.latitude}, ${marker.longitude}`}
            >
              {marker.studentName?.charAt(0) || 'S'}
            </div>
          ))}
        </div>
      </div>

      <div className="safety-card">
        <div className="safety-card-head">
          <h3>Recent Incidents</h3>
          <div>
            <button type="button" className="btn-secondary" onClick={() => handleExport('incidents')}>
              Export Incidents CSV
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Description</th>
                <th>Action Taken</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 8).map((item) => (
                <tr key={item.id}>
                  <td>{item.studentName}</td>
                  <td>{item.description}</td>
                  <td>{item.action_taken || '-'}</td>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="safety-card">
        <h3>High-Risk Areas</h3>
        <ul className="safety-list">
          {riskAreas.map((area, idx) => (
            <li key={`${area.latitudeCluster}-${area.longitudeCluster}-${idx}`}>
              {area.latitudeCluster}, {area.longitudeCluster} {'->'} {area.violationCount} violations
            </li>
          ))}
        </ul>
      </div>

      <div className="safety-card">
        <h3>Incident Trends (Last 30 Days)</h3>
        <ul className="safety-list">
          {trends.map((trend) => (
            <li key={trend.incidentDate}>
              {new Date(trend.incidentDate).toLocaleDateString()} {'->'} {trend.incidentCount} incidents
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SafetyDashboard;
