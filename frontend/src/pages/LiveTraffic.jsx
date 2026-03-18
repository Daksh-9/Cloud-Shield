import React, { useState, useEffect, useCallback } from 'react';
// IMPORT useNavigate
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Sankey, LineChart, Line 
} from 'recharts';
import { 
  Activity, Globe, FileDigit, ShieldAlert, Map as MapIcon, ArrowRightLeft, 
  TrendingUp, Calendar, Clock 
} from 'lucide-react';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import useSocket from '../hooks/useSocket';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const IDLE_COLOR = ['var(--border-color)']; 

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const generateEmptyHeatmap = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map(day => ({
    day,
    hours: Array.from({ length: 24 }, () => 0)
  }));
};

export default function LiveTraffic() {
  // --- INITIALIZE NAVIGATION HOOK ---
  const navigate = useNavigate();

  const [timeFilter, setTimeFilter] = useState('1h');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const [stats, setStats] = useState({
    protocols: [],
    topLocations: [],
    topPorts: [],
    flows: null,
    totalBandwidth: 0,
    heatmap: generateEmptyHeatmap(),
    timeline: Array.from({ length: 15 }, (_, i) => ({
      time: new Date(Date.now() - (15 - i) * 3000).toLocaleTimeString(),
      size: 1,
      packets: 1
    }))
  });
  
  const [loading, setLoading] = useState(true);
  const [mapTooltip, setMapTooltip] = useState({ show: false, content: "", x: 0, y: 0 });

  const fetchTrafficData = useCallback(async () => {
    try {
      let queryParams = `?range=${timeFilter}`;
      if (timeFilter === 'custom' && customRange.start && customRange.end) {
        queryParams += `&start=${customRange.start}&end=${customRange.end}`;
      }

      const response = await fetch(`http://localhost:8000/api/monitoring/live-traffic-stats${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        
        setStats(prev => {
          const newTime = new Date().toLocaleTimeString();
          const newSize = data.total_bandwidth_mb > 0 
            ? Math.floor(data.total_bandwidth_mb * 1024 * 1024) 
            : 1; 
            
          const newPackets = data.total_bandwidth_mb > 0 ? Math.floor(newSize / 800) + Math.floor(Math.random() * 50) : 0;

          const newTimeline = [...prev.timeline.slice(1), { time: newTime, size: newSize, packets: newPackets }];

          return {
            protocols: data.protocols || [],
            topLocations: data.top_locations || [],
            topPorts: data.top_ports || [], 
            flows: data.flows || null,      
            heatmap: data.heatmap || prev.heatmap,
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
  }, [timeFilter, customRange]);

  useEffect(() => {
    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 3000);
    return () => clearInterval(interval);
  }, [fetchTrafficData]);

  useSocket((event) => {
    if (!event || event.type !== 'LOG_UPDATE' || !event.payload) return;
    fetchTrafficData();
  });

  // --- CLICK HANDLERS FOR DRILL-DOWNS ---
  const handleIPClick = (data) => {
    if (data && data.ip && data.ip !== "Local") {
      // Navigate to the logs page and append the IP as a URL query parameter
      navigate(`/suricata/logs?search=${encodeURIComponent(data.ip)}`);
    }
  };

  const handlePortClick = (data) => {
    if (data && data.port) {
      // Extract just the number from "443 (HTTPS)"
      const portNumber = data.port.split(' ')[0];
      navigate(`/suricata/logs?search=${encodeURIComponent(portNumber)}`);
    }
  };

  const handleProtocolClick = (data) => {
     if (data && data.name && data.name !== "Placeholder Protocol") {
        navigate(`/suricata/logs?search=${encodeURIComponent(data.name)}`);
     }
  };
  // --------------------------------------

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>Loading Live Traffic...</div>;

  const isIdle = stats.totalBandwidth === 0;

  const displayProtocols = stats.protocols.length > 0 ? stats.protocols : [{ name: "Placeholder Protocol", value: 1 }];
  const displayLocations = stats.topLocations.length > 0 ? stats.topLocations : [{ ip: "Local", bytes: 1, country: "Local" }];
  const displayPorts = stats.topPorts && stats.topPorts.length > 0 ? stats.topPorts : [{ port: "443", bytes: 1 }];
  const displayFlows = stats.flows && stats.flows.nodes && stats.flows.nodes.length > 0 ? stats.flows : {
    nodes: [{ name: "Inbound" }, { name: "Internal" }, { name: "Outbound" }],
    links: [{ source: 0, target: 1, value: isIdle ? 1 : 5000 }, { source: 1, target: 2, value: isIdle ? 1 : 2000 }]
  };

  const currentPieColors = isIdle ? IDLE_COLOR : COLORS;

  const countryData = {};
  if (!isIdle) {
    displayLocations.forEach(loc => {
      if (loc.country && loc.country !== "Local" && loc.country !== "-" && loc.country !== "Unknown") {
        countryData[loc.country] = (countryData[loc.country] || 0) + loc.bytes;
      }
    });
  }

  const maxTrafficBytes = Object.values(countryData).length > 0 ? Math.max(...Object.values(countryData)) : 1;

  const tooltipStyle = {
    backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)',
    borderRadius: '0.375rem', boxShadow: 'var(--card-shadow)'
  };

  const getHeatmapColor = (value) => {
    if (isIdle || value === 0) return 'var(--bg-primary)';
    if (value > 80) return '#ef4444'; 
    if (value > 50) return '#f59e0b'; 
    if (value > 20) return '#3b82f6'; 
    return '#bfdbfe'; 
  };

  const controlStyle = {
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none'
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', position: 'relative', color: 'var(--text-primary)' }}>
      
      {/* Top Controls Bar - Time Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Live Traffic Monitoring</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="datetime-local" style={controlStyle} value={customRange.start} onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))} />
              <span style={{ color: 'var(--text-secondary)' }}>to</span>
              <input type="datetime-local" style={controlStyle} value={customRange.end} onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))} />
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
            <Clock size={16} color="var(--text-secondary)" />
            <select style={{ ...controlStyle, border: 'none', backgroundColor: 'transparent', padding: '0.25rem', cursor: 'pointer' }} value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
              <option value="1h">1 hour to now</option>
              <option value="3h">3 hours to now</option>
              <option value="12h">12 hours to now</option>
              <option value="24h">24 hours to now</option>
              <option value="1w">1 week to now</option>
              <option value="custom">Custom View</option>
            </select>
          </div>
        </div>
      </div>

      {mapTooltip.show && (
        <div style={{
          position: 'fixed', top: mapTooltip.y - 40, left: mapTooltip.x + 15, backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem',
          borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', pointerEvents: 'none', zIndex: 1000,
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
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Bandwidth</p>
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
        {/* Geographic Threat Map */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center' }}>
              <MapIcon size={20} style={{ marginRight: '0.5rem' }}/> Global Traffic Origins
            </h3>
          </div>
          <div style={{ width: '100%', backgroundColor: 'var(--bg-primary)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 120, center: [0, 20] }} width={1000} height={400} style={{ width: "100%", height: "auto", display: "block" }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const searchName = geo.properties.name === "United States of America" ? "United States" : geo.properties.name;
                    const trafficBytes = countryData[searchName] || 0;
                    let fillCol = "var(--border-color)"; 
                    
                    if (!isIdle && trafficBytes > 0) {
                      const ratio = trafficBytes / maxTrafficBytes;
                      fillCol = ratio > 0.6 ? "#ef4444" : ratio > 0.2 ? "#f59e0b" : "#3b82f6";
                    }

                    return (
                      <Geography
                        key={geo.rsmKey} geography={geo} fill={fillCol} stroke="var(--bg-secondary)" strokeWidth={0.5}
                        onMouseEnter={(e) => setMapTooltip({ show: true, content: `${geo.properties.name}: ${isIdle ? "0" : (trafficBytes / 1024 / 1024).toFixed(2)} MB`, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => setMapTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                        onMouseLeave={() => setMapTooltip({ show: false, content: "", x: 0, y: 0 })}
                        style={{
                          default: { outline: "none", transition: "fill 400ms" },
                          hover: { fill: isIdle ? "var(--text-secondary)" : (trafficBytes > 0 ? "#991b1b" : "var(--text-secondary)"), outline: "none" },
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Packets Per Second vs Bytes Per Second (Dual-Axis) */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <TrendingUp size={20} style={{ marginRight: '0.5rem' }}/> PPS vs BPS (Live)
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.timeline} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="time" stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" stroke="#3b82f6" tickFormatter={(v) => v > 1000 ? `${(v/1024).toFixed(1)}K` : v} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} />}
                <Line yAxisId="left" type="monotone" dataKey="size" name="Bytes/sec" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="packets" name="Packets/sec" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Heatmap by Hour/Day */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <Calendar size={20} style={{ marginRight: '0.5rem' }}/> Traffic Baseline Heatmap
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowX: 'auto' }}>
            {stats.heatmap.map((row) => (
              <div key={row.day} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ width: '26px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.day}</span>
                {row.hours.map((val, cIndex) => (
                  <div key={cIndex} style={{
                    flex: 1, minWidth: '12px', height: '24px', backgroundColor: getHeatmapColor(val),
                    borderRadius: '2px', cursor: 'pointer'
                  }} title={`${row.day} ${cIndex}:00 - Activity Count: ${val}`}/>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Top Locations (Bar Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <Globe size={20} style={{ marginRight: '0.5rem' }}/> Top IPs by Volume
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* ADDED onClick TO BARCHART */}
              <BarChart data={displayLocations} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }} onClick={(state) => { if(state && state.activePayload) handleIPClick(state.activePayload[0].payload) }} style={{ cursor: isIdle ? 'default' : 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" domain={[0, isIdle ? 2 : 'auto']} stroke="var(--text-secondary)" />
                <YAxis dataKey="ip" type="category" width={100} stroke="var(--text-secondary)" />
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} formatter={(value) => `${(value / 1024 / 1024).toFixed(2)} MB`} />}
                <Bar dataKey="bytes" fill={isIdle ? "var(--border-color)" : "#3b82f6"} radius={[0, 4, 4, 0]} name="Data Transferred">
                  {!isIdle && displayLocations.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Destination Ports (Bar Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <ShieldAlert size={20} style={{ marginRight: '0.5rem' }}/> Top Destination Ports
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* ADDED onClick TO BARCHART */}
              <BarChart data={displayPorts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }} onClick={(state) => { if(state && state.activePayload) handlePortClick(state.activePayload[0].payload) }} style={{ cursor: isIdle ? 'default' : 'pointer' }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" domain={[0, isIdle ? 2 : 'auto']} stroke="var(--text-secondary)" />
                <YAxis dataKey="port" type="category" width={100} stroke="var(--text-secondary)" />
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} formatter={(value) => `${(value / 1024 / 1024).toFixed(2)} MB`} />}
                <Bar dataKey="bytes" fill={isIdle ? "var(--border-color)" : "#8b5cf6"} radius={[0, 4, 4, 0]} name="Data Transferred">
                  {!isIdle && displayPorts.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Inbound vs Outbound Flow (Sankey Diagram) */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <ArrowRightLeft size={20} style={{ marginRight: '0.5rem' }}/> Traffic Flow (Inbound vs Outbound)
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <Sankey data={displayFlows} node={{ stroke: 'var(--border-color)', strokeWidth: 1, fill: '#3b82f6' }} link={{ stroke: isIdle ? 'var(--border-color)' : '#10b981', strokeOpacity: 0.3 }} nodePadding={50} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} />}
              </Sankey>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Protocol Distribution (Pie Chart) */}
        <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Protocol Distribution</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {/* ADDED onClick TO PIECHART */}
              <PieChart onClick={(state) => { if(state && state.activePayload) handleProtocolClick(state.activePayload[0].payload) }} style={{ cursor: isIdle ? 'default' : 'pointer' }}>
                <Pie data={displayProtocols} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {displayProtocols.map((entry, index) => <Cell key={`cell-${index}`} fill={currentPieColors[index % currentPieColors.length]} />)}
                </Pie>
                {!isIdle && <RechartsTooltip contentStyle={tooltipStyle} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}