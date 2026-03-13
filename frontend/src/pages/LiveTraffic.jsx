import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Globe, FileDigit, ShieldAlert, Map as MapIcon } from 'lucide-react';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import useSocket from '../hooks/useSocket';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const IDLE_COLOR = ['var(--border-color)']; 

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

          // Prevent duplicate timeline bumps if websocket just fired
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

  // INSTANT LIVE UPDATES: Triggered by the Python backend via WebSocket
  useSocket((event) => {
    if (!event || event.type !== 'LOG_UPDATE' || !event.payload) return;

    // 1. Immediately fetch the fresh GeoIP data to color the map instantly
    fetchTrafficData();

    // 2. Bump the timeline visualizer
    setStats((prev) => {
      const newTime = new Date().toLocaleTimeString();
      const newSize = Math.max(1, prev.timeline[prev.timeline.length - 1]?.size || 1);
      const newTimeline = [...prev.timeline.slice(1), { time: newTime, size: newSize }];

      return {
        ...prev,
        timeline: newTimeline,
      };
    });
  });

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>Loading Live Traffic...</div>;

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

  // Aggregate country bytes for the heatmap calculation
  const countryData = {};
  if (!isIdle) {
    displayLocations.forEach(loc => {
      if (loc.country && loc.country !== "Local" && loc.country !== "-" && loc.country !== "Unknown") {
        countryData[loc.country] = (countryData[loc.country] || 0) + loc.bytes;
      }
    });
  }

  // Find the absolute highest traffic country to set the 100% threshold for our heatmap colors
  const maxTrafficBytes = Object.values(countryData).length > 0 ? Math.max(...Object.values(countryData)) : 1;

  // Common styles for Recharts Tooltips to support Dark Mode
  const tooltipStyle = {
    backgroundColor: 'var(--bg-secondary)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '0.375rem',
    boxShadow: 'var(--card-shadow)'
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', position: 'relative', color: 'var(--text-primary)' }}>
      
      {/* Tooltip for hovering over countries */}
      {mapTooltip.show && (
        <div style={{
          position: 'fixed',
          top: mapTooltip.y - 40,
          left: mapTooltip.x + 15,
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: 'var(--card-shadow)'
        }}>
          {mapTooltip.content}
        </div>
      )}

      {/* Header Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <Activity size={24} color="#3b82f6" />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Monitored Bandwidth</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{isIdle ? 0 : stats.totalBandwidth} MB</h3>
          </div>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <FileDigit size={24} color="#10b981" />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active Protocols</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{isIdle ? 0 : stats.protocols.length} Detected</h3>
          </div>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <ShieldAlert size={24} color={isIdle ? "#f59e0b" : "#10b981"} />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>System Status</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: isIdle ? "#f59e0b" : "#10b981" }}>{isIdle ? "Monitoring..." : "Active"}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Geographic Threat Map with Heatmap Colors */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)', gridColumn: '1 / -1' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center' }}>
              <MapIcon size={20} style={{ marginRight: '0.5rem' }}/> Global Traffic Origins
            </h3>
            
            {/* COLOR LEGEND */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#ef4444' }}/> High Volume</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#f59e0b' }}/> Medium Volume</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#3b82f6' }}/> Low Volume</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--border-color)' }}/> No Traffic</span>
            </div>
          </div>

          <div style={{ width: '100%', backgroundColor: 'var(--bg-primary)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {/* ADDED projection="geoMercator" for a flat map */}
            <ComposableMap 
              projection="geoMercator" 
              projectionConfig={{ scale: 120, center: [0, 20] }} 
              width={1000} 
              height={400} 
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoName = geo.properties.name;
                    const searchName = geoName === "United States of America" ? "United States" : geoName;
                    
                    const trafficBytes = countryData[searchName] || 0;
                    const hasTraffic = trafficBytes > 0;
                    
                    let fillCol = "var(--border-color)"; 
                    
                    if (isIdle) {
                      fillCol = "var(--border-color)";
                    } else if (hasTraffic) {
                      const ratio = trafficBytes / maxTrafficBytes;
                      if (ratio > 0.6) fillCol = "#ef4444";      // RED
                      else if (ratio > 0.2) fillCol = "#f59e0b"; // ORANGE
                      else fillCol = "#3b82f6";                  // BLUE
                    }

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillCol}
                        stroke="var(--bg-secondary)"
                        strokeWidth={0.5}
                        onMouseEnter={(e) => {
                          setMapTooltip({ 
                            show: true, 
                            content: `${geoName}: ${isIdle ? "0" : (trafficBytes / 1024 / 1024).toFixed(2)} MB`, 
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
                          default: { outline: "none", transition: "fill 400ms ease-in-out" },
                          hover: { fill: isIdle ? "var(--text-secondary)" : (hasTraffic ? "#991b1b" : "var(--text-secondary)"), outline: "none", cursor: "crosshair", transition: "fill 100ms" },
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
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <Globe size={20} style={{ marginRight: '0.5rem' }}/> Top IPs by Volume
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayLocations} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" domain={[0, isIdle ? 2 : 'auto']} stroke="var(--text-secondary)" />
                <YAxis dataKey="ip" type="category" width={100} stroke="var(--text-secondary)" />
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} formatter={(value) => `${(value / 1024 / 1024).toFixed(2)} MB`} />}
                <Bar dataKey="bytes" fill={isIdle ? "var(--border-color)" : "#3b82f6"} radius={[0, 4, 4, 0]} name="Data Transferred">
                  {!isIdle && displayLocations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protocol Distribution (Pie Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
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
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline (Area Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Live Message Size (Bytes/sec)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" stroke="var(--text-secondary)" />
                <YAxis domain={[0, isIdle ? 2 : 'auto']} stroke="var(--text-secondary)" />
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} />}
                <Area 
                  type="monotone" 
                  dataKey="size" 
                  stroke={isIdle ? "var(--text-secondary)" : "#10b981"} 
                  fill={isIdle ? "var(--bg-primary)" : "#10b981"} 
                  fillOpacity={0.2}
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