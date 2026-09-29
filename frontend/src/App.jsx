import { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Terminal
} from 'lucide-react';
import { healthCheckAPI, triggerTestError } from './services/api';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    const startTime = performance.now();
    try {
      const response = await healthCheckAPI();
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setHealthData(response);
      setSelectedResponse({
        type: 'HEALTH_CHECK_SUCCESS',
        status: 200,
        payload: response,
      });
    } catch (err) {
      setSelectedResponse({
        type: 'HEALTH_CHECK_ERROR',
        status: err.status || 500,
        payload: err,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestError = async () => {
    setLoading(true);
    try {
      await triggerTestError();
    } catch (err) {
      setSelectedResponse({
        type: 'STANDARDIZED_404_ERROR_RESPONSE',
        status: 404,
        payload: err,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadHealth = async () => {
      const startTime = performance.now();
      try {
        const response = await healthCheckAPI();
        if (active) {
          const endTime = performance.now();
          setLatency(Math.round(endTime - startTime));
          setHealthData(response);
          setSelectedResponse({
            type: 'HEALTH_CHECK_SUCCESS',
            status: 200,
            payload: response,
          });
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setSelectedResponse({
            type: 'HEALTH_CHECK_ERROR',
            status: err.status || 500,
            payload: err,
          });
          setLoading(false);
        }
      }
    };
    loadHealth();
    return () => {
      active = false;
    };
  }, []);

  const isDbConnected = healthData?.data?.database?.status === 'connected';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--bg-card-border)',
          background: 'rgba(10, 13, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
              }}
            >
              <Sparkles size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  KudosWall
                </h1>
                <span
                  style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  FOUNDATION PHASE
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Internal Team Feedback &amp; Peer Recognition Engine
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className={`status-pill ${
                isDbConnected ? 'success' : loading ? 'warning' : 'error'
              }`}
            >
              <span className="status-dot pulse-indicator"></span>
              <span>{isDbConnected ? 'System Operational' : loading ? 'Checking...' : 'System Degraded'}</span>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              title="Refresh health check"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Ping</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px', flex: 1, width: '100%' }}>
        {/* Hero Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2.1rem', marginBottom: '8px', color: '#ffffff' }}>
            Project Foundation &amp; Runtime Status
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '780px' }}>
            Welcome to Operation 1 of the Kudos Wall platform. The core full-stack foundation has been
            bootstrapped with Express.js, MongoDB connection pooling, standardized API contracts, and Vite React frontend.
          </p>
        </div>

        {/* Status Metrics Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          {/* Backend API Metric */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Backend API Service</span>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' }}>
                <Server size={20} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              {healthData?.data?.status === 'ok' ? 'Healthy & Running' : loading ? 'Connecting...' : 'Offline'}
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-subtle)', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>Port: 5000</span>
              <span>•</span>
              <span>Uptime: {healthData?.data?.uptime || 'N/A'}</span>
            </div>
          </div>

          {/* Database Metric */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>MongoDB Database</span>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
                <Database size={20} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isDbConnected ? '#34d399' : '#f87171', marginBottom: '4px' }}>
              {isDbConnected ? 'Connected' : loading ? 'Checking...' : 'Disconnected'}
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-subtle)' }}>
              Database: <span style={{ color: '#ffffff' }}>{healthData?.data?.database?.name || 'kudos_wall'}</span>
            </div>
          </div>

          {/* Latency Metric */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>API Roundtrip Latency</span>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8' }}>
                <Activity size={20} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              {latency !== null ? `${latency} ms` : 'Measuring...'}
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-subtle)' }}>
              Vite Proxy to Express Gateway
            </div>
          </div>

          {/* Architecture Status */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Security Standard</span>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(217, 70, 239, 0.12)', color: '#e879f9' }}>
                <ShieldCheck size={20} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
              Helmet &amp; CORS
            </div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-subtle)' }}>
              Ready for Dual JWT Auth
            </div>
          </div>
        </div>

        {/* Interactive Testing & Verification Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          {/* Left Column: Foundation Checklist & Controls */}
          <div className="glass-panel" style={{ padding: '26px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="#10b981" />
              Verified Foundation Deliverables
            </h3>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {[
                { title: 'Full-Stack Structure', desc: 'Separate backend & frontend with orchestrated dev scripts.' },
                { title: 'MongoDB Connection with Pooling', desc: 'Mongoose connection lifecycle & graceful shutdown.' },
                { title: 'Environment Config (.env.example)', desc: 'Validated runtime variables with fallbacks.' },
                { title: 'Health-Check Endpoint (/api/health)', desc: 'Returns service status, uptime & DB metrics.' },
                { title: 'Standardized API Contract', desc: 'Unified { success, message, data, error } schema.' },
                { title: 'Centralized Error Handling', desc: 'Catches 404s, JSON syntax errors, and database exceptions.' },
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: '18px', marginTop: '3px' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div style={{ borderTop: '1px solid var(--bg-card-border)', paddingTop: '20px' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
                Test Standardized API Responses:
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={fetchHealth}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem' }}
                >
                  <Activity size={14} />
                  Test Health Check (200 OK)
                </button>
                <button
                  onClick={handleTestError}
                  disabled={loading}
                  className="btn btn-outline-danger"
                  style={{ fontSize: '0.85rem' }}
                >
                  <AlertCircle size={14} />
                  Test Error Handler (404 Not Found)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live API Response Inspector */}
          <div className="glass-panel" style={{ padding: '26px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={20} color="#818cf8" />
                Live API Response Inspector
              </h3>
              {selectedResponse && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: selectedResponse.status === 200 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: selectedResponse.status === 200 ? '#34d399' : '#f87171',
                    border: `1px solid ${selectedResponse.status === 200 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontWeight: 600,
                  }}
                >
                  HTTP {selectedResponse.status}
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Inspect the exact JSON contract returned by the Express backend. All endpoints adhere to this consistent structure.
            </p>

            <div style={{ flex: 1, minHeight: '260px' }}>
              <pre style={{ height: '100%', minHeight: '260px', margin: 0 }}>
                {loading ? (
                  <span style={{ color: 'var(--text-muted)' }}>Executing API request...</span>
                ) : selectedResponse ? (
                  JSON.stringify(selectedResponse.payload, null, 2)
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No request executed yet. Click a test button above.</span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--bg-card-border)',
          background: 'rgba(10, 13, 20, 0.95)',
          padding: '20px 24px',
          color: 'var(--text-subtle)',
          fontSize: '0.825rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            KudosWall Architecture • <span style={{ color: 'var(--text-muted)' }}>Bonusly / Matter Alternative</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Node.js v24.17.0</span>
            <span>•</span>
            <span>MongoDB v8.3.4</span>
            <span>•</span>
            <span>Express.js &amp; React 19</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
