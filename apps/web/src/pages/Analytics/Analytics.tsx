import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { mockIncidents } from '../../data/mockIncidents';
import { mockResources } from '../../data/mockResources';
import { mockShelters } from '../../data/mockShelters';
import { ShieldAlert, Users, Truck } from 'lucide-react';
import styles from './Analytics.module.css';

export const Analytics: React.FC = () => {
  // 1. Calculate Incident Severity Pie Chart Data
  const severityCount = mockIncidents.reduce((acc: Record<string, number>, curr) => {
    acc[curr.severity] = (acc[curr.severity] || 0) + 1;
    return acc;
  }, {});

  const severityData = [
    { name: 'Critical', value: severityCount['CRITICAL'] || 0, color: '#D94B3D' },
    { name: 'High', value: severityCount['HIGH'] || 0, color: '#F47C20' },
    { name: 'Medium', value: severityCount['MEDIUM'] || 0, color: '#E7A72B' },
    { name: 'Low', value: severityCount['LOW'] || 0, color: '#4F8F5B' }
  ];

  // 2. Resource stock availability by Depot
  const depotResources = mockResources.reduce((acc: Record<string, number>, curr) => {
    const key = curr.locationName.split(' ')[0]; // E.g. "East" or "Delhi"
    acc[key] = (acc[key] || 0) + curr.quantity;
    return acc;
  }, {});

  const resourceData = Object.keys(depotResources).map(key => ({
    name: key + ' Depot',
    Quantity: depotResources[key]
  }));

  // 3. Shelter Capacity details
  const shelterCapData = mockShelters.map(shl => ({
    name: shl.name.split(' ')[0], // Short name
    Occupied: shl.capacityOccupied,
    Available: shl.capacityTotal - shl.capacityOccupied
  }));

  // 4. Incident Hourly Timeline
  const timelineData = [
    { time: '18:00', alerts: 1 },
    { time: '19:00', alerts: 2 },
    { time: '20:00', alerts: 4 },
    { time: '21:00', alerts: 2 },
    { time: '22:00', alerts: 5 },
    { time: '23:00', alerts: 3 },
    { time: '00:00', alerts: 6 }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Operational Analytics Deck</h2>
        <p className={styles.subtext}>Aggregated resource flows, regional threat matrices, and emergency shelter network dashboards.</p>
      </div>

      {/* Metrics Highlights */}
      <div className={styles.metricsGrid}>
        <div className={styles.cardStat}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(217, 75, 61, 0.1)', color: '#D94B3D' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <span className={styles.statLabel}>Active Threat Ratio</span>
            <h3 className={styles.statVal}>83% Urgent</h3>
          </div>
        </div>

        <div className={styles.cardStat}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(79, 143, 91, 0.1)', color: '#4F8F5B' }}>
            <Users size={20} />
          </div>
          <div>
            <span className={styles.statLabel}>Shelter Occupancy Rate</span>
            <h3 className={styles.statVal}>67.1% Overall</h3>
          </div>
        </div>

        <div className={styles.cardStat}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(244, 124, 32, 0.1)', color: '#F47C20' }}>
            <Truck size={20} />
          </div>
          <div>
            <span className={styles.statLabel}>Supply Pipeline Load</span>
            <h3 className={styles.statVal}>12,450 kg Active</h3>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid}>
        {/* Card 1: Threat Severity */}
        <div className={styles.chartCard}>
          <h4>Threat Severity Distribution</h4>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Incident Feed Rate */}
        <div className={styles.chartCard}>
          <h4>Incident Alert Velocity (Last 6 Hours)</h4>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                <XAxis dataKey="time" stroke="#68716C" fontSize={11} />
                <YAxis stroke="#68716C" fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="alerts" stroke="#F47C20" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Shelter Bed Allocation */}
        <div className={styles.chartCard}>
          <h4>Shelter Bed Allocation Ledger</h4>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shelterCapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                <XAxis dataKey="name" stroke="#68716C" fontSize={11} />
                <YAxis stroke="#68716C" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Occupied" stackId="a" fill="#21583F" />
                <Bar dataKey="Available" stackId="a" fill="#D9D2C7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Depot Storage Capacities */}
        <div className={styles.chartCard}>
          <h4>Active Materials Registry by Depot</h4>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                <XAxis dataKey="name" stroke="#68716C" fontSize={11} />
                <YAxis stroke="#68716C" fontSize={11} />
                <Tooltip />
                <Bar dataKey="Quantity" fill="#F47C20" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
