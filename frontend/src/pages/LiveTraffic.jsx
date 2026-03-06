import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Globe, FileDigit, ShieldAlert, Map as MapIcon } from 'lucide-react';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const IDLE_COLOR = ['#94a3b8']; 

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function LiveTraffic() {
  const [stats, setStats] = useState({
    protocols: [],
    topLocations: [],
    totalBandwidth: 0,
    timeline: Array.from({ length: 15 }, (_, i) => ({
      time: new Date(Date.now() - (15 - i) * 3000).toLocaleTimeString(),
      size: 1
    }))
  });
  
  const [loading, setLoading] = useState(true);
  
  // NEW: Reactive Map Tooltip State
  const [mapTooltip, setMapTooltip] = useState({ show: false, content: "", x: 0, y: 0 });

  const fetchTrafficData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/monitoring/live-traffic-stats');
      if (response.ok) {
        const data = await response.json();
        
        setStats(prev => {
          const newTime = new Date().toLocaleTimeString();
          const newSize = data.total_bandwidth_mb > 0 
            ? Math.floor(data.total_bandwidth_mb * 1024 * 1024) 
            : 1; 

          const newTimeline = [...prev.timeline.slice(1), { time: newTime, size: newSize }];

          return {
            protocols: data.protocols,
            topLocations: data.top_locations,
            totalBandwidth: data.total_bandwidth_mb,
            timeline: newTimeline
          };
        });
      }
    } catch (error) {
      console.error("Failed to fetch live traffic:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Live Traffic...</div>;

  const isIdle = stats.totalBandwidth === 0;

  const displayProtocols = stats.protocols.length > 0 
    ? stats.protocols 
    : [{ name: "Placeholder Protocol", value: 1 }];

  const displayLocations = stats.topLocations.length > 0 
    ? stats.topLocations 
    : [
        { ip: "192.168.1.1", bytes: 1, country: "Local" },
        { ip: "10.0.0.1", bytes: 1, country: "Local" },
        { ip: "172.16.0.1", bytes: 1, country: "Local" }
      ];

  const currentPieColors = isIdle ? IDLE_COLOR : COLORS;

  const countryData = {};
  if (!isIdle) {
    displayLocations.forEach(loc => {
      if (loc.country && loc.country !== "Local" && loc.country !== "-" && loc.country !== "Unknown") {
        countryData[loc.country] = (countryData[loc.country] || 0) + loc.bytes;
      }
    });
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
      
      {/* NEW: Floating Tooltip for the Map */}
      {mapTooltip.show && (
        <div style={{
          position: 'fixed',
          top: mapTooltip.y - 40,
          left: mapTooltip.x + 15,
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          {mapTooltip.content}
        </div>
      )}

      {/* Header Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc' }}>
          <Activity size={24} color="#3b82f6" />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Total Monitored Bandwidth</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{isIdle ? 1 : stats.totalBandwidth} MB</h3>
          </div>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc' }}>
          <FileDigit size={24} color="#10b981" />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Active Protocols</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{isIdle ? 1 : stats.protocols.length} Detected</h3>
          </div>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f8fafc' }}>
          <ShieldAlert size={24} color={isIdle ? "#f59e0b" : "#10b981"} />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>System Status</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: isIdle ? "#f59e0b" : "#10b981" }}>{isIdle ? "Monitoring..." : "Active"}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Geographic Threat Map */}
        <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: '#ffffff', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <MapIcon size={20} style={{ marginRight: '0.5rem' }}/> Global Traffic Origins
          </h3>
          <div style={{ width: '100%', backgroundColor: '#f8fafc', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {/* FORCE WIDESCREEN ASPECT RATIO (1000x400) */}
            <ComposableMap projectionConfig={{ scale: 140 }} width={1000} height={400} style={{ width: "100%", height: "auto", display: "block" }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoName = geo.properties.name;
                    const searchName = geoName === "United States of America" ? "United States" : geoName;
                    
                    const trafficBytes = countryData[searchName] || 0;
                    const hasTraffic = trafficBytes > 0;
                    
                    let fillCol = "#e2e8f0"; 
                    if (isIdle) fillCol = "#cbd5e1"; 
                    else if (hasTraffic) fillCol = "#3b82f6"; 

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillCol}
                        stroke="#ffffff"
                        strokeWidth={0.5}
                        // REACTIVE HOVER EVENTS
                        onMouseEnter={(e) => {
                          setMapTooltip({ 
                            show: true, 
                            content: `${geoName}: ${isIdle ? "0" : trafficBytes} Bytes`, 
                            x: e.clientX, 
                            y: e.clientY 
                          });
                        }}
                        onMouseMove={(e) => {
                          setMapTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                        }}
                        onMouseLeave={() => {
                          setMapTooltip({ show: false, content: "", x: 0, y: 0 });
                        }}
                        style={{
                          default: { outline: "none", transition: "all 250ms" },
                          hover: { fill: isIdle ? "#94a3b8" : (hasTraffic ? "#1d4ed8" : "#94a3b8"), outline: "none", cursor: "crosshair" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Top Locations (Bar Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <Globe size={20} style={{ marginRight: '0.5rem' }}/> Top IPs by Volume
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayLocations} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, isIdle ? 2 : 'auto']} />
                <YAxis dataKey="ip" type="category" width={100} />
                {!isIdle && <RechartsTooltip />}
                <Bar dataKey="bytes" fill={isIdle ? "#cbd5e1" : "#3b82f6"} radius={[0, 4, 4, 0]} name="Bytes Transferred">
                  {!isIdle && displayLocations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protocol Distribution (Pie Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Protocol Distribution</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayProtocols}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {displayProtocols.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={currentPieColors[index % currentPieColors.length]} />
                  ))}
                </Pie>
                {!isIdle && <RechartsTooltip />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline (Area Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', backgroundColor: '#ffffff', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Live Message Size (Bytes/sec)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" />
                <YAxis domain={[0, isIdle ? 2 : 'auto']} />
                {!isIdle && <RechartsTooltip />}
                <Area 
                  type="monotone" 
                  dataKey="size" 
                  stroke={isIdle ? "#94a3b8" : "#10b981"} 
                  fill={isIdle ? "#f1f5f9" : "#d1fae5"} 
                  name="Bytes" 
                  isAnimationActive={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}