import { useState, useEffect } from 'react'
import { Layers, Database, Shield, Zap, RefreshCw, Server, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react'

interface BackendStatus {
  status: string;
  database: string;
  mongodb: string;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'api' | 'databases'>('architecture')
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/api/health')
      if (!res.ok) throw new Error('Backend returned non-OK status')
      const data = await res.json()
      setBackendStatus(data)
    } catch (err: any) {
      setError(err.message || 'Could not connect to backend service')
      setBackendStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '60px' }}>
      <div className="glow-bg" />

      {/* Navbar */}
      <header style={{
        borderBottom: '1px solid var(--border-light)',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(4, 7, 20, 0.4)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Layers style={{ color: 'var(--accent-primary)' }} size={28} />
          <h2 style={{ fontSize: '24px', letterSpacing: '-0.03em' }}>
            Social<span style={{ color: 'var(--accent-primary)' }}>Pilot</span>
          </h2>
          <span style={{
            fontSize: '11px',
            background: 'rgba(255,255,255,0.06)',
            padding: '2px 8px',
            borderRadius: '10px',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)'
          }}>Clean Arch v1.0</span>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${activeTab === 'architecture' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('architecture')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Architecture
          </button>
          <button 
            className={`btn ${activeTab === 'api' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('api')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            API Diagnostics
          </button>
          <button 
            className={`btn ${activeTab === 'databases' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('databases')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Databases
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '40px auto 0', padding: '0 24px' }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 className="gradient-text" style={{ fontSize: '48px', fontWeight: 800, marginBottom: '12px' }}>
            Clean Architecture Boilerplate
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            Ready-to-use template for SocialPilot. Separating Business Domain Logic from Frameworks, Presentation layers, and External Infrastructures.
          </p>
        </section>

        {/* Tab content 1: Architecture */}
        {activeTab === 'architecture' && (
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield style={{ color: 'var(--accent-primary)' }} />
                Clean Architecture Principle
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Dependencies flow strictly inwards. The innermost **Domain Layer** contains the core business models (Entities) and contracts (Interfaces/Repositories). It has zero knowledge of databases, routing, web servers, or external services.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ background: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                  <div>
                    <h4 style={{ fontSize: '14px' }}>Domain Layer (Core)</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Entities & Interfaces: Pure business rules</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ background: 'var(--accent-secondary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                  <div>
                    <h4 style={{ fontSize: '14px' }}>Application Layer</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Use cases: Logic mapping and orchestration</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ background: 'var(--accent-cyan)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>3</div>
                  <div>
                    <h4 style={{ fontSize: '14px' }}>Infrastructure / Presentation Layers</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>FastAPI routes, PostgreSQL, MongoDB, External integrations</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ background: 'rgba(10, 15, 30, 0.4)', borderStyle: 'dashed' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Project Layers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--accent-primary)' }}>
                  <h4 style={{ fontSize: '15px' }}>frontend/src/services</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Handles external API calls. Kept modular so it can be replaced or updated without touching components.</p>
                </div>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--accent-secondary)' }}>
                  <h4 style={{ fontSize: '15px' }}>backend/app/domain</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Defines entities representing social posts, schedules, and user credentials.</p>
                </div>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <h4 style={{ fontSize: '15px' }}>backend/app/infrastructure</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Contains repositories implementing SQL/NoSQL CRUD endpoints, keeping FastAPI routers clean.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab content 2: API Diagnostics */}
        {activeTab === 'api' && (
          <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '22px' }}>FastAPI Backend Health Check</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Verify connection to backend endpoints running inside Docker.</p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={checkHealth} 
                disabled={loading}
                style={{ padding: '8px 16px' }}
              >
                <RefreshCw size={16} className={loading ? 'spin' : ''} style={{ animation: loading ? 'shine 1s linear infinite' : 'none' }} />
                {loading ? 'Refreshing...' : 'Run Diagnostics'}
              </button>
            </div>

            <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Server size={20} style={{ color: backendStatus ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
                <span style={{ fontWeight: 600 }}>Endpoint:</span>
                <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-cyan)' }}>
                  GET http://localhost:8000/api/health
                </code>
              </div>

              {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Contacting the backend API...</p>
              ) : error ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <AlertTriangle size={20} />
                  <span>Connection failed: {error} (Is docker-compose container running?)</span>
                </div>
              ) : backendStatus ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status Response</span>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-emerald)' }}>{backendStatus.status}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Last pinged</span>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{backendStatus.timestamp}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No diagnostics run yet.</p>
              )}
            </div>
          </section>
        )}

        {/* Tab content 3: Databases */}
        {activeTab === 'databases' && (
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database style={{ color: 'var(--accent-primary)' }} />
                  PostgreSQL
                </h3>
                {backendStatus?.database === 'connected' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-emerald)', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                    <CheckCircle2 size={12} /> Live
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
                    Unknown
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Used as the primary relational database for relational assets: user accounts, schedules, platforms authorization keys, and activity logs.
              </p>
              <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <code style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PORT: 5432 | DB: socialpilot_db</code>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap style={{ color: 'var(--accent-secondary)' }} />
                  MongoDB
                </h3>
                {backendStatus?.mongodb === 'connected' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-emerald)', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                    <CheckCircle2 size={12} /> Live
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
                    Unknown
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Used for unstructured data like rich-text media campaigns, analytics logs, and queued template cache.
              </p>
              <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <code style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PORT: 27017 | DB: socialpilot_db</code>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px',
        textAlign: 'center',
        borderTop: '1px solid var(--border-light)',
        color: 'var(--text-muted)',
        fontSize: '12px'
      }}>
        SocialPilot Clean Architecture Boilerplate • Designed for scalability
      </footer>
    </div>
  )
}
