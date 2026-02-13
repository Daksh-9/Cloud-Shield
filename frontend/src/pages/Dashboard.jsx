import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { monitoringService } from '../services/monitoring';
import { authService } from '../services/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState({ logs: [], alerts: [] });
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load initial data
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadInitialData();
  }, [navigate]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsData, logsData, alertsData] = await Promise.all([
        monitoringService.getMetrics().catch(() => null),
        monitoringService.getRecentLogs(5).catch(() => ({ logs: [] })),
        monitoringService.getRecentAlerts(5).catch(() => ({ alerts: [] }))
      ]);

      if (metricsData) setMetrics(metricsData);
      setRecentActivity({
        logs: logsData.logs || [],
        alerts: alertsData.alerts || []
      });
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to load dashboard data. Please refresh the page.');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket connection for live updates
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const ws = monitoringService.createWebSocketConnection(
      token,
      (message) => {
        if (message.type === 'metrics') {
          setMetrics(message.data);
          setLastUpdate(new Date());
        } else if (message.type === 'recent_activity') {
          setRecentActivity(message.data);
        }
      },
      () => setWsConnected(false),
      () => setWsConnected(false)
    );

    setWsConnected(true);

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Memoized statistics cards data
  const statsCards = useMemo(() => {
    if (!metrics) return [];
    
    return [
      {
        label: 'Total Logs',
        value: metrics.logs?.counts?.total?.toLocaleString() || '0',
        status: 'Active',
        color: '#2196F3',
        icon: '📊',
        trend: metrics.logs?.recent_hour > 0 ? 'up' : 'neutral'
      },
      {
        label: 'Active Alerts',
        value: metrics.alerts?.counts?.open?.toLocaleString() || '0',
        status: metrics.alerts?.counts?.open > 0 ? 'Attention' : 'Normal',
        color: metrics.alerts?.counts?.open > 0 ? '#F44336' : '#4CAF50',
        icon: '🚨',
        trend: 'neutral'
      },
      {
        label: 'Critical Alerts',
        value: metrics.alerts?.counts?.by_severity?.critical?.toLocaleString() || '0',
        status: metrics.alerts?.counts?.by_severity?.critical > 0 ? 'Critical' : 'None',
        color: '#9C27B0',
        icon: '⚠️',
        trend: 'neutral'
      },
      {
        label: 'Recent Activity',
        value: `${(metrics.logs?.recent_hour || 0) + (metrics.alerts?.recent_hour || 0)}`,
        status: 'Last Hour',
        color: '#FF9800',
        icon: '⚡',
        trend: 'neutral'
      }
    ];
  }, [metrics]);

  // Format time helper
  const formatTime = useCallback((date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  }, []);

  // Loading skeleton component
  const LoadingSkeleton = ({ className = '' }) => (
    <div 
      className={className}
      style={{
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
      aria-label="Loading"
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );

  // Error state
  if (error && !metrics) {
    return (
      <div 
        style={{ 
          padding: '2rem', 
          maxWidth: '1400px', 
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}
      >
        <div 
          style={{
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#c62828', marginBottom: '0.5rem' }}>Failed to Load Dashboard</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={loadInitialData}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1976D2';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2196F3';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            aria-label="Retry loading dashboard"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        padding: 'clamp(1rem, 2vw, 2rem)', 
        maxWidth: '1400px', 
        margin: '0 auto',
        minHeight: '100vh'
      }}
    >
      {/* Header Section */}
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <h1 style={{ 
            margin: 0,
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: '700',
            color: '#1a1a1a',
            borderBottom: '3px solid #2196F3',
            paddingBottom: '0.5rem',
            display: 'inline-block'
          }}>
            Cloud Shield Dashboard
          </h1>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem',
            fontSize: '0.875rem',
            color: '#666'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: wsConnected ? '#e8f5e9' : '#fff3e0',
              borderRadius: '20px',
              border: `1px solid ${wsConnected ? '#4CAF50' : '#FF9800'}`
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: wsConnected ? '#4CAF50' : '#FF9800',
                animation: wsConnected ? 'pulse-dot 2s ease-in-out infinite' : 'none'
              }} />
              <span>{wsConnected ? 'Live' : 'Polling'}</span>
            </div>
            {lastUpdate && (
              <span>Updated {formatTime(lastUpdate)}</span>
            )}
          </div>
        </div>
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.2); }
          }
        `}</style>
      </header>

      {/* System Health Cards - Responsive Grid */}
      <section 
        aria-label="System statistics"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: 'clamp(1rem, 2vw, 1.5rem)', 
          marginBottom: '2rem' 
        }}
      >
        {loading && !metrics ? (
          Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} style={{ height: '140px' }} />
          ))
        ) : (
          statsCards.map((card, idx) => (
            <div
              key={idx}
              role="article"
              aria-label={`${card.label}: ${card.value}`}
              tabIndex={0}
              style={{
                backgroundColor: '#fff',
                padding: 'clamp(1rem, 2vw, 1.5rem)',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `2px solid ${card.color}20`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 16px ${card.color}30`;
                e.currentTarget.style.borderColor = card.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = `${card.color}20`;
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = `3px solid ${card.color}`;
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              onClick={() => {
                if (card.label.includes('Logs')) navigate('/logs');
                if (card.label.includes('Alert')) navigate('/alerts');
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '0.75rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: '#666', fontWeight: '500' }}>
                  {card.label}
                </div>
                <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
              </div>
              <div style={{ 
                fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', 
                fontWeight: '700', 
                color: '#1a1a1a',
                marginBottom: '0.5rem',
                lineHeight: '1.2'
              }}>
                {card.value}
              </div>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: card.color, 
                fontWeight: '600', 
                fontSize: '0.875rem'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: card.color,
                  display: 'inline-block'
                }} />
                {card.status}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Traffic Overview Graph */}
      <section 
        aria-label="Traffic overview"
        style={{ 
          backgroundColor: '#fff', 
          padding: 'clamp(1rem, 2vw, 1.5rem)', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '2rem'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ 
            margin: 0,
            fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            Traffic Overview (Last Hour)
          </h2>
          <button
            onClick={() => navigate('/monitoring')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#2196F3',
              border: '1px solid #2196F3',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2196F3';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#2196F3';
            }}
            aria-label="View detailed traffic monitoring"
          >
            View Details →
          </button>
        </div>
        {loading ? (
          <LoadingSkeleton style={{ height: '250px' }} />
        ) : (
          <div style={{ 
            height: '250px', 
            backgroundColor: '#f8f9fa', 
            display: 'flex', 
            alignItems: 'flex-end', 
            padding: '1rem', 
            gap: '4px', 
            borderRadius: '8px', 
            border: '1px solid #e0e0e0',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {Array.from({ length: 60 }).map((_, i) => {
              const height = Math.floor(Math.random() * 80) + 20;
              const isRecent = i > 50;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${height}%`,
                    backgroundColor: isRecent ? '#e74c3c' : '#3498db',
                    borderRadius: '2px 2px 0 0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                    e.currentTarget.style.transform = 'scaleY(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'scaleY(1)';
                  }}
                  aria-label={`Traffic at minute ${60 - i}: ${height}%`}
                />
              );
            })}
          </div>
        )}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '0.75rem', 
          fontSize: '0.75rem', 
          color: '#666',
          padding: '0 1rem'
        }}>
          <span>60m</span>
          <span>45m</span>
          <span>30m</span>
          <span>15m</span>
          <span>5m</span>
          <span>now</span>
        </div>
      </section>

      {/* Two Column Layout - Responsive */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 'clamp(1rem, 2vw, 2rem)', 
        marginBottom: '2rem' 
      }}>
        {/* Active Threats */}
        <section
          aria-label="Active threats"
          style={{ 
            backgroundColor: '#fff', 
            padding: 'clamp(1rem, 2vw, 1.5rem)', 
            borderRadius: '12px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Active Threats
            </h2>
            <button
              onClick={() => navigate('/alerts')}
              style={{ 
                border: 'none', 
                background: 'none', 
                color: '#2196F3', 
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e3f2fd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="View all alerts"
            >
              View All →
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} style={{ height: '60px' }} />
              ))}
            </div>
          ) : recentActivity.alerts.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#666'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p style={{ margin: 0 }}>No active threats</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentActivity.alerts.slice(0, 3).map((threat, idx) => {
                const severityColors = {
                  critical: '#e74c3c',
                  high: '#f39c12',
                  medium: '#f1c40f',
                  low: '#95a5a6'
                };
                const severity = threat.severity?.toLowerCase() || 'medium';
                const color = severityColors[severity] || severityColors.medium;
                
                return (
                  <div
                    key={threat.id || idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/alerts/${threat.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/alerts/${threat.id}`);
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '0.875rem', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px', 
                      borderLeft: `4px solid ${color}`,
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    aria-label={`Threat: ${threat.title || threat.message}, severity: ${severity}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600',
                        marginBottom: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {threat.title || threat.message || 'Unknown Threat'}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          backgroundColor: `${color}20`,
                          color: color,
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {severity}
                        </span>
                        {threat.created_at && (
                          <span>{formatTime(new Date(threat.created_at))}</span>
                        )}
                      </div>
                    </div>
                    <button
                      style={{ 
                        padding: '0.375rem 0.75rem', 
                        fontSize: '0.75rem', 
                        backgroundColor: color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        marginLeft: '0.5rem',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      aria-label={`View details for ${threat.title || 'threat'}`}
                    >
                      View
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Alerts */}
        <section
          aria-label="Recent alerts"
          style={{ 
            backgroundColor: '#fff', 
            padding: 'clamp(1rem, 2vw, 1.5rem)', 
            borderRadius: '12px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Recent Alerts
            </h2>
            <button
              onClick={() => navigate('/alerts')}
              style={{ 
                border: 'none', 
                background: 'none', 
                color: '#2196F3', 
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e3f2fd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="View all alerts"
            >
              View All →
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} style={{ height: '60px' }} />
              ))}
            </div>
          ) : recentActivity.alerts.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#666'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <p style={{ margin: 0 }}>No recent alerts</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentActivity.alerts.slice(0, 5).map((alert, idx) => {
                const severityColors = {
                  critical: '#e74c3c',
                  high: '#e67e22',
                  medium: '#f1c40f',
                  low: '#95a5a6'
                };
                const severity = alert.severity?.toLowerCase() || 'medium';
                const color = severityColors[severity] || severityColors.medium;
                
                return (
                  <div
                    key={alert.id || idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/alerts/${alert.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/alerts/${alert.id}`);
                      }
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem', 
                      padding: '0.875rem',
                      paddingBottom: '0.875rem', 
                      borderBottom: idx < recentActivity.alerts.length - 1 ? '1px solid #e0e0e0' : 'none',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.paddingLeft = '1rem';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.paddingLeft = '0.875rem';
                    }}
                    aria-label={`Alert: ${alert.title || alert.message}, severity: ${severity}`}
                  >
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: '#666', 
                      minWidth: '50px',
                      fontWeight: '500'
                    }}>
                      {alert.created_at ? formatTime(new Date(alert.created_at)) : 'Now'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600',
                        marginBottom: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {alert.title || alert.message || 'Unknown Alert'}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: color,
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {severity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Status Cards Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 'clamp(1rem, 2vw, 2rem)', 
        marginBottom: '2rem' 
      }}>
        {/* ML Status */}
        <section
          aria-label="ML detection status"
          style={{ 
            backgroundColor: '#fff', 
            padding: 'clamp(1rem, 2vw, 1.5rem)', 
            borderRadius: '12px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <h2 style={{ 
            marginBottom: '1rem',
            fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            ML Detection Status
          </h2>
          {loading ? (
            <LoadingSkeleton style={{ height: '120px' }} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Status:{' '}
                  <span style={{ color: '#4CAF50', fontWeight: '600' }}>
                    ● Active
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Model: <strong style={{ color: '#1a1a1a' }}>RF v2.4</strong>
                </div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Accuracy: <strong style={{ color: '#1a1a1a' }}>98.7%</strong>
                </div>
              </div>
              <div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Analyzed: <strong style={{ color: '#1a1a1a' }}>124.5K</strong>
                </div>
                <button
                  onClick={() => navigate('/ml')}
                  style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.625rem 1.25rem', 
                    backgroundColor: '#2196F3', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    width: '100%',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1976D2';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(33, 150, 243, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2196F3';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  aria-label="View ML detection details"
                >
                  View Details →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Suricata Status */}
        <section
          aria-label="Suricata status"
          style={{ 
            backgroundColor: '#fff', 
            padding: 'clamp(1rem, 2vw, 1.5rem)', 
            borderRadius: '12px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <h2 style={{ 
            marginBottom: '1rem',
            fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            Suricata Status
          </h2>
          {loading ? (
            <LoadingSkeleton style={{ height: '120px' }} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Status:{' '}
                  <span style={{ color: '#4CAF50', fontWeight: '600' }}>
                    ● Running
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Version: <strong style={{ color: '#1a1a1a' }}>8.0.3</strong>
                </div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Rules: <strong style={{ color: '#1a1a1a' }}>Active</strong>
                </div>
              </div>
              <div>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#666' }}>
                  Alerts (24h): <strong style={{ color: '#1a1a1a' }}>2,847</strong>
                </div>
                <button
                  onClick={() => navigate('/suricata/rules')}
                  style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.625rem 1.25rem', 
                    backgroundColor: '#FF9800', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    width: '100%',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F57C00';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 152, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF9800';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  aria-label="View Suricata rules"
                >
                  View Details →
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Distribution Charts */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 'clamp(1rem, 2vw, 2rem)' 
      }}>
        <section
          aria-label="Top source countries"
          style={{ 
            backgroundColor: '#fff', 
            padding: 'clamp(1rem, 2vw, 1.5rem)', 
            borderRadius: '12px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <h2 style={{ 
            marginBottom: '1rem',
            fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            Top Source Countries
          </h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingSkeleton key={i} style={{ height: '24px' }} />
              ))}
            </div>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[{c:'US', v:45}, {c:'CN', v:28}, {c:'RU', v:12}, {c:'BR', v:8}, {c:'Other', v:7}].map((d, idx) => (
                <div 
                  key={d.c} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ 
                    width: '50px', 
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: '#1a1a1a'
                  }}>
                    {d.c}
                  </span>
                  <div style={{ 
                    flex: 1, 
                    backgroundColor: '#e0e0e0', 
                    height: '12px', 
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div 
                      style={{ 
                        width: `${d.v}%`, 
                        backgroundColor: '#2196F3', 
                        height: '100%', 
                        borderRadius: '6px',
                        transition: 'width 0.5s ease'
                      }}
                      aria-label={`${d.c}: ${d.v}%`}
                    />
                  </div>
                  <span style={{ 
                    width: '40px', 
                    textAlign: 'right',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: '#666'
                  }}>
                    {d.v}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          aria-label="Protocol distribution"
          style={{ 
            backgroundColor: '#fff', 
            padding: 'clamp(1rem, 2vw, 1.5rem)', 
            borderRadius: '12px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <h2 style={{ 
            marginBottom: '1rem',
            fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>
            Protocol Distribution
          </h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingSkeleton key={i} style={{ height: '24px' }} />
              ))}
            </div>
          ) : (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[{c:'TCP', v:64}, {c:'UDP', v:28}, {c:'ICMP', v:5}, {c:'Other', v:3}].map((d, idx) => (
                <div 
                  key={d.c} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{ 
                    width: '50px', 
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: '#1a1a1a'
                  }}>
                    {d.c}
                  </span>
                  <div style={{ 
                    flex: 1, 
                    backgroundColor: '#e0e0e0', 
                    height: '12px', 
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div 
                      style={{ 
                        width: `${d.v}%`, 
                        backgroundColor: '#FF9800', 
                        height: '100%', 
                        borderRadius: '6px',
                        transition: 'width 0.5s ease'
                      }}
                      aria-label={`${d.c}: ${d.v}%`}
                    />
                  </div>
                  <span style={{ 
                    width: '40px', 
                    textAlign: 'right',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: '#666'
                  }}>
                    {d.v}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
