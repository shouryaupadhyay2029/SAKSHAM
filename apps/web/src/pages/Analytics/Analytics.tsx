import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './Analytics.module.css';

/* ───────────────────────────────────────────────
   STATIC INTELLIGENCE DATA (labelled DEMO MODEL)
   ─────────────────────────────────────────────── */
const VELOCITY_DATA = [
  { time: '18:00', incidents: 1, demand: 1, dispatched: 0, resolved: 0 },
  { time: '19:00', incidents: 2, demand: 1, dispatched: 1, resolved: 0 },
  { time: '20:00', incidents: 3, demand: 2, dispatched: 2, resolved: 1 },
  { time: '21:00', incidents: 4, demand: 3, dispatched: 2, resolved: 1 },
  { time: '22:00', incidents: 5, demand: 4, dispatched: 3, resolved: 2 },
  { time: '23:00', incidents: 5, demand: 5, dispatched: 4, resolved: 2 },
  { time: '00:00', incidents: 5, demand: 5, dispatched: 4, resolved: 3 },
];

const PRESSURE_ZONES = [
  { rank: '01', name: 'Yamuna Bank', area: 'East Delhi', risk: 'CRITICAL', incidents: 2, demand: '12,000 L', gap: 'Water −3,000 L', color: '#DC2626' },
  { rank: '02', name: 'Rohini', area: 'North-West Delhi', risk: 'HIGH', incidents: 1, demand: '500 units', gap: 'Blankets OK', color: '#E86F16' },
  { rank: '03', name: 'Okhla', area: 'South-East Delhi', risk: 'HIGH', incidents: 1, demand: '4 sets', gap: 'Equipment OK', color: '#E86F16' },
  { rank: '04', name: 'Karol Bagh', area: 'Central Delhi', risk: 'MEDIUM', incidents: 1, demand: '50 kits', gap: 'Medical −35', color: '#EAB308' },
];

const RESOURCE_PRESSURE = [
  { name: 'Drinking Water', demand: 12000, available: 15000, unit: 'L', status: 'OK' },
  { name: 'Trauma Kits', demand: 120, available: 85, unit: 'Kits', status: 'CRITICAL' },
  { name: 'Thermal Blankets', demand: 500, available: 2400, unit: 'Pcs', status: 'OK' },
  { name: 'Dry Rations', demand: 2000, available: 4500, unit: 'Pkts', status: 'OK' },
  { name: 'Rescue Boats', demand: 6, available: 6, unit: 'Boats', status: 'TIGHT' },
  { name: 'Infant Formula', demand: 100, available: 0, unit: 'Kg', status: 'DEPLETED' },
];

const PREDICTIVE_RISKS = [
  {
    zone: 'Yamuna Bank', type: 'Flood Risk', level: 'HIGH', trend: '+18%',
    current: 72, forecast: 85, label: 'Flood water level rising — 12 additional families displaced predicted.',
  },
  {
    zone: 'Akshardham', type: 'Shelter Saturation', level: 'CRITICAL', trend: '+12%',
    current: 98, forecast: 100, label: 'Shelter capacity critical. Overflow expected within 35 min.',
  },
  {
    zone: 'South Delhi', type: 'Medical Demand', level: 'MEDIUM', trend: '+7%',
    current: 55, forecast: 62, label: 'Medical demand pressure increasing. Trauma kit replenishment needed.',
  },
  {
    zone: 'Okhla', type: 'Structural Risk', level: 'MEDIUM', trend: '+4%',
    current: 48, forecast: 52, label: 'Post-collapse structural instability. Secondary collapses possible.',
  },
];

const SHELTER_FORECAST_DATA = [
  { time: 'Now', rohini: 84, akshardham: 98, dwarka: 28, civilLines: 0, safe: 85, critical: 95 },
  { time: '+1H', rohini: 87, akshardham: 100, dwarka: 32, civilLines: 0, safe: 85, critical: 95 },
  { time: '+2H', rohini: 89, akshardham: 100, dwarka: 35, civilLines: 0, safe: 85, critical: 95 },
  { time: '+4H', rohini: 91, akshardham: 100, dwarka: 40, civilLines: 5, safe: 85, critical: 95 },
];

const BOTTLENECKS = [
  {
    rank: '01', title: 'TRAUMA KIT SHORTAGE', location: 'South Depot, Saket',
    detail: 'Demand: 120 kits · Available: 85 kits · Gap: 35 kits',
    recommendation: 'Prioritize redistribution from Central Warehouse (4,500 ration-equivalent stock).',
    severity: 'CRITICAL',
  },
  {
    rank: '02', title: 'SHELTER CAPACITY — AKSHARDHAM', location: 'East Delhi',
    detail: '98% occupied · Only 20 beds remaining · Overflow imminent',
    recommendation: 'Redirect incoming displaced persons from Akshardham → Dwarka (72% available capacity).',
    severity: 'HIGH',
  },
  {
    rank: '03', title: 'INFANT FORMULA DEPLETED', location: 'West Depot, Janakpuri',
    detail: 'Demand active · Stock: 0 Kg · Last updated 00:05 IST',
    recommendation: 'Emergency procurement required. Cross-check NGO partner inventory for short-term supply.',
    severity: 'HIGH',
  },
];

const DECISIONS = [
  {
    rank: '01', priority: 'HIGH PRIORITY',
    action: 'Redistribute 35 trauma kits from Central Warehouse → South Depot',
    impact: 'Eliminate the 35-kit medical gap. Improve triage capacity by ~29%.',
    btn: 'REVIEW ALLOCATION',
  },
  {
    rank: '02', priority: 'HIGH PRIORITY',
    action: 'Redirect shelter demand from Akshardham → Dwarka Sector 10',
    impact: 'Prevent Akshardham saturation. Dwarka has 215 beds available.',
    btn: 'REVIEW ROUTE',
  },
  {
    rank: '03', priority: 'MEDIUM PRIORITY',
    action: 'Deploy VEH-DR-501 (Available Drone) to Yamuna Bank for aerial mapping',
    impact: 'Improve situational awareness. Map secondary flood zones within 20 min.',
    btn: 'REVIEW DEPLOYMENT',
  },
];

const TIME_RANGES = ['LIVE', '6H', '24H', '7D', '30D'];
const REGIONS = ['Delhi NCR', 'East Delhi', 'North Delhi', 'South Delhi', 'West Delhi'];

/* ───────────────────────────────────────────────
   CUSTOM RECHARTS TOOLTIP
   ─────────────────────────────────────────────── */
const VelocityTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipTime}>{label}</span>
      {payload.map((p: any, i: number) => (
        <div key={i} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

/* ───────────────────────────────────────────────
   ANIMATED COUNT-UP HOOK
   ─────────────────────────────────────────────── */
function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

/* ═══════════════════════════════════════════════
   MAIN ANALYTICS COMPONENT
   ═══════════════════════════════════════════════ */
export const Analytics: React.FC = () => {
  const { incidents, shelters, vehicles, requests } = useOperationalState();

  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState('LIVE');
  const [region, setRegion] = useState('Delhi NCR');
  const [velocityLines, setVelocityLines] = useState({
    incidents: true, demand: true, dispatched: true, resolved: true,
  });
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false, timeZone: 'Asia/Kolkata' }) + ' IST');
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Derived live metrics
  const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL').length;
  const pendingDemands = requests.filter(r => r.status === 'PENDING').length;
  const vehiclesOnMission = vehicles.filter(v => v.status === 'EN_ROUTE' || v.status === 'DISPATCHED').length;
  const totalCap = shelters.reduce((a, s) => a + s.capacityTotal, 0);
  const totalOcc = shelters.reduce((a, s) => a + s.capacityOccupied, 0);
  const shelterPct = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

  const cActiveInc = useCountUp(activeIncidents);
  const cCritical = useCountUp(criticalIncidents);
  const cPendingDem = useCountUp(pendingDemands);
  const cVehicles = useCountUp(vehiclesOnMission);
  const cShelterPct = useCountUp(shelterPct);

  // Shelter chart data from real shelters
  const shelterBarData = shelters.map(s => ({
    name: s.name.split(' ')[0],
    Occupied: s.capacityOccupied,
    Available: s.capacityTotal - s.capacityOccupied,
  }));

  const toggleVelocityLine = (key: keyof typeof velocityLines) => {
    setVelocityLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedZoneData = PRESSURE_ZONES.find(z => z.name === selectedZone);

  return (
    <div className={`${styles.container} ${mounted ? styles.mounted : ''}`}>

      {/* ══ 1. PAGE HEADER ══ */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>RESPONSE INTELLIGENCE</span>
          <h1 className={styles.title}>Operational Intelligence Center</h1>
          <p className={styles.lead}>
            Transforming live incidents, resource availability, demand signals and field activity into actionable response decisions.
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.systemLive}>
            <span className={styles.liveDot} />
            <span className={styles.liveText}>SYSTEM LIVE</span>
          </div>
          <div className={styles.lastAnalysis}>
            <div className={styles.lastAnalysisRow}>
              <span className={styles.laLabel}>LAST ANALYSIS</span>
              <span className={styles.laValue}>JUST NOW</span>
            </div>
            <div className={styles.lastAnalysisRow}>
              <span className={styles.laLabel}>UPDATED</span>
              <span className={styles.laTime}>{currentTime}</span>
            </div>
          </div>
          <div className={styles.dataFreshness}>
            <span className={styles.dfLabel}>LIVE DATA</span>
            <span className={styles.dfSources}>Incidents · Demand · Resources · Fleet · Shelters</span>
          </div>
        </div>
      </header>

      {/* ══ CONTROL BAR ══ */}
      <div className={styles.controlBar}>
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>TIME RANGE</span>
          <div className={styles.segmented}>
            {TIME_RANGES.map(t => (
              <button
                key={t}
                className={`${styles.segBtn} ${timeRange === t ? styles.segBtnActive : ''}`}
                onClick={() => setTimeRange(t)}
              >{t}</button>
            ))}
          </div>
        </div>
        <div className={styles.controlDivider} />
        <div className={styles.controlGroup}>
          <span className={styles.controlLabel}>REGION</span>
          <select
            className={styles.regionSelect}
            value={region}
            onChange={e => setRegion(e.target.value)}
          >
            {REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className={styles.controlDivider} />
        <div className={styles.controlRight}>
          <button className={styles.refreshBtn}>↻ REFRESH ANALYSIS</button>
          <span className={styles.controlTime}>{currentTime}</span>
        </div>
      </div>

      {/* ══ 2. RESPONSE PULSE ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 01</span>
            <h2 className={styles.sectionTitle}>Response Pulse</h2>
          </div>
          <p className={styles.sectionDesc}>Current operational pressure across the response network.</p>
        </div>

        <div className={styles.pulseStrip}>
          <div className={`${styles.pulseCell} ${styles.pulseCellCritical}`}>
            <span className={styles.pulseNum}>{String(cActiveInc).padStart(2, '0')}</span>
            <span className={styles.pulseLabel}>ACTIVE INCIDENTS</span>
            <span className={styles.pulseTrend}>↑ 2 since 18:00</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={`${styles.pulseCell} ${styles.pulseCellWarning}`}>
            <span className={styles.pulseNum}>{String(cCritical).padStart(2, '0')}</span>
            <span className={styles.pulseLabel}>CRITICAL</span>
            <span className={styles.pulseTrend}>↑ 1 in last hour</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={styles.pulseCell}>
            <span className={styles.pulseNum}>{String(cPendingDem).padStart(2, '0')}</span>
            <span className={styles.pulseLabel}>PENDING DEMANDS</span>
            <span className={styles.pulseTrend}>↔ Unchanged</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={`${styles.pulseCell} ${styles.pulseCellOrange}`}>
            <span className={styles.pulseNum}>{String(cVehicles).padStart(2, '0')}</span>
            <span className={styles.pulseLabel}>VEHICLES ON MISSION</span>
            <span className={styles.pulseTrend}>↑ 1 dispatched</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={`${styles.pulseCell} ${cShelterPct >= 80 ? styles.pulseCellWarning : styles.pulseCellGreen}`}>
            <span className={styles.pulseNum}>{cShelterPct}%</span>
            <span className={styles.pulseLabel}>SHELTER CAPACITY</span>
            <span className={styles.pulseTrend}>↓ 4% available</span>
          </div>
        </div>
      </section>

      {/* ══ 3. OPERATIONAL PRESSURE MAP ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 02</span>
            <h2 className={styles.sectionTitle}>Operational Pressure</h2>
          </div>
          <p className={styles.sectionDesc}>Where incidents, demand and resource constraints are converging.</p>
        </div>

        <div className={styles.pressureLayout}>
          {/* Pressure zones list */}
          <div className={styles.pressureZones}>
            <span className={styles.zonesTitle}>HIGHEST PRESSURE ZONES</span>
            {PRESSURE_ZONES.map(z => (
              <div
                key={z.name}
                className={`${styles.zoneRow} ${selectedZone === z.name ? styles.zoneRowSelected : ''}`}
                onClick={() => setSelectedZone(selectedZone === z.name ? null : z.name)}
              >
                <span className={styles.zoneRank}>{z.rank}</span>
                <div className={styles.zoneMain}>
                  <div className={styles.zoneNameRow}>
                    <span className={styles.zoneName}>{z.name}</span>
                    <span className={styles.zoneArea}>{z.area}</span>
                  </div>
                  <div className={styles.zoneMeta}>
                    <span className={styles.zoneMetaItem}>INC: {z.incidents}</span>
                    <span className={styles.zoneMetaItem}>DMD: {z.demand}</span>
                    <span className={styles.zoneMetaItem}>{z.gap}</span>
                  </div>
                </div>
                <span className={styles.zoneRisk} style={{ color: z.color }}>
                  <span className={styles.zoneRiskDot} style={{ background: z.color }} />
                  {z.risk}
                </span>
              </div>
            ))}
          </div>

          {/* Map visualization — SVG-based geographic pressure display */}
          <div className={styles.mapPanel}>
            <div className={styles.mapLegend}>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#DC2626' }} />Critical Incident</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#E86F16' }} />High Demand</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#059669' }} />Resource Depot</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#6366F1' }} />Vehicle</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#0B2119', opacity: 0.5 }} />Shelter</span>
            </div>
            <svg viewBox="0 0 480 360" className={styles.mapSvg}>
              {/* Soft background */}
              <rect width="480" height="360" fill="#F7F5EF" rx="4" />
              <text x="240" y="20" textAnchor="middle" fontSize="9" fill="rgba(11,33,25,0.3)" fontWeight="700" letterSpacing="2">DELHI NCR — OPERATIONAL PRESSURE MAP</text>

              {/* Grid lines */}
              {[80, 160, 240, 320, 400].map(x => (
                <line key={x} x1={x} y1="30" x2={x} y2="340" stroke="rgba(11,33,25,0.05)" strokeWidth="1" />
              ))}
              {[80, 140, 200, 260, 320].map(y => (
                <line key={y} x1="20" y1={y} x2="460" y2={y} stroke="rgba(11,33,25,0.05)" strokeWidth="1" />
              ))}

              {/* Route lines */}
              <line x1="280" y1="120" x2="170" y2="95" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />
              <line x1="230" y1="190" x2="280" y2="235" stroke="#6366F1" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />

              {/* Pressure halos */}
              <circle cx="300" cy="190" r="38" fill="rgba(220,38,38,0.07)" />
              <circle cx="160" cy="90" r="28" fill="rgba(232,111,22,0.07)" />

              {/* Incidents */}
              <g onClick={() => setSelectedZone('Yamuna Bank')} style={{ cursor: 'pointer' }}>
                <circle cx="300" cy="190" r="12" fill="#DC2626" opacity="0.9" />
                <circle cx="300" cy="190" r="20" fill="rgba(220,38,38,0.2)" className={styles.pulseCircle} />
                <text x="300" y="215" textAnchor="middle" fontSize="8" fill="#DC2626" fontWeight="800">YAMUNA BANK</text>
              </g>
              <g onClick={() => setSelectedZone('Rohini')}>
                <circle cx="160" cy="90" r="9" fill="#E86F16" opacity="0.9" />
                <text x="160" y="110" textAnchor="middle" fontSize="8" fill="#E86F16" fontWeight="800">ROHINI</text>
              </g>
              <g onClick={() => setSelectedZone('Okhla')}>
                <circle cx="310" cy="295" r="9" fill="#E86F16" opacity="0.85" />
                <text x="310" y="315" textAnchor="middle" fontSize="8" fill="#E86F16" fontWeight="800">OKHLA</text>
              </g>
              <g onClick={() => setSelectedZone('Karol Bagh')}>
                <circle cx="218" cy="160" r="7" fill="#EAB308" opacity="0.9" />
                <text x="218" y="178" textAnchor="middle" fontSize="8" fill="#EAB308" fontWeight="800">KAROL BAGH</text>
              </g>

              {/* Resource Depots */}
              <rect x="290" y="80" width="12" height="12" fill="#059669" opacity="0.85" rx="2" />
              <text x="296" y="70" textAnchor="middle" fontSize="7" fill="#059669">E.DEPOT</text>
              <rect x="196" y="176" width="12" height="12" fill="#059669" opacity="0.85" rx="2" />
              <text x="202" y="198" textAnchor="middle" fontSize="7" fill="#059669">C.DEPOT</text>

              {/* Shelters */}
              <polygon points="162,68 168,80 156,80" fill="#0B2119" opacity="0.5" />
              <text x="162" y="62" textAnchor="middle" fontSize="7" fill="rgba(11,33,25,0.6)">ROHINI SHL</text>
              <polygon points="296,220 302,232 290,232" fill="#DC2626" opacity="0.7" />
              <text x="296" y="244" textAnchor="middle" fontSize="7" fill="#DC2626">AKSHARDHAM</text>

              {/* Vehicles */}
              <circle cx="270" cy="135" r="5" fill="#6366F1" />
              <text x="270" y="127" textAnchor="middle" fontSize="7" fill="#6366F1">VEH-TR-101</text>
              <circle cx="286" cy="255" r="5" fill="#6366F1" />
              <text x="286" y="247" textAnchor="middle" fontSize="7" fill="#6366F1">VEH-TR-102</text>
              <circle cx="234" cy="175" r="5" fill="#6366F1" opacity="0.7" />

              {selectedZone && selectedZoneData && (
                <g>
                  <rect x="10" y="298" width="200" height="52" fill="#FAF8F3" stroke="rgba(11,33,25,0.15)" rx="3" />
                  <text x="20" y="313" fontSize="8" fontWeight="800" fill={selectedZoneData.color}>{selectedZoneData.name.toUpperCase()}</text>
                  <text x="20" y="326" fontSize="7" fill="rgba(11,33,25,0.6)">INCIDENTS: {selectedZoneData.incidents}</text>
                  <text x="20" y="338" fontSize="7" fill="rgba(11,33,25,0.6)">DEMAND: {selectedZoneData.demand}</text>
                  <text x="20" y="350" fontSize="7" fill="rgba(11,33,25,0.6)">{selectedZoneData.gap}</text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </section>

      {/* ══ 4. RESPONSE VELOCITY ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 03</span>
            <h2 className={styles.sectionTitle}>Response Velocity</h2>
          </div>
          <p className={styles.sectionDesc}>How quickly the network is detecting, matching and responding to incidents.</p>
        </div>

        <div className={styles.velocityLayout}>
          <div className={styles.velocityMeta}>
            {[
              { label: 'AVG RESPONSE TIME', value: '18 min' },
              { label: 'MATCHING TIME', value: '4.2 min' },
              { label: 'DISPATCH TIME', value: '7.8 min' },
              { label: 'RESOLUTION TIME', value: '42 min' },
            ].map(m => (
              <div key={m.label} className={styles.velocityMetaCell}>
                <span className={styles.velMetaVal}>{m.value}</span>
                <span className={styles.velMetaLabel}>{m.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.velocityControls}>
            {(['incidents', 'demand', 'dispatched', 'resolved'] as const).map(k => (
              <button
                key={k}
                className={`${styles.lineToggle} ${velocityLines[k] ? styles.lineToggleActive : ''}`}
                onClick={() => toggleVelocityLine(k)}
              >
                <span className={styles.lineToggleDot} style={{
                  background: k === 'incidents' ? '#DC2626' : k === 'demand' ? '#E86F16' : k === 'dispatched' ? '#6366F1' : '#059669'
                }} />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>

          <div className={styles.velocityChart}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={VELOCITY_DATA} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,33,25,0.06)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(11,33,25,0.3)" fontSize={10} tick={{ fontWeight: 700 }} />
                <YAxis stroke="rgba(11,33,25,0.3)" fontSize={10} allowDecimals={false} />
                <Tooltip content={<VelocityTooltip />} />
                {velocityLines.incidents && <Line type="monotone" dataKey="incidents" name="Incidents" stroke="#DC2626" strokeWidth={2} dot={false} />}
                {velocityLines.demand && <Line type="monotone" dataKey="demand" name="Demand" stroke="#E86F16" strokeWidth={2} dot={false} />}
                {velocityLines.dispatched && <Line type="monotone" dataKey="dispatched" name="Dispatched" stroke="#6366F1" strokeWidth={2} dot={false} />}
                {velocityLines.resolved && <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#059669" strokeWidth={2} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ══ 5. RESOURCE PRESSURE ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 04</span>
            <h2 className={styles.sectionTitle}>Resource Pressure</h2>
          </div>
          <p className={styles.sectionDesc}>Where current inventory may fail to meet projected demand.</p>
        </div>

        <div className={styles.resourcePressureGrid}>
          {RESOURCE_PRESSURE.map(r => {
            const gap = r.available - r.demand;
            const maxBar = Math.max(r.demand, r.available, 1);
            const demandPct = Math.round((r.demand / maxBar) * 100);
            const availPct = Math.round((r.available / maxBar) * 100);
            const isGap = gap < 0;
            const isDepleted = r.status === 'DEPLETED';

            return (
              <div key={r.name} className={`${styles.resPressCard} ${isGap || isDepleted ? styles.resPressCardCritical : ''}`}>
                <div className={styles.resPressHeader}>
                  <span className={styles.resPressName}>{r.name}</span>
                  <span className={`${styles.resStatus} ${styles['resStatus_' + r.status]}`}>
                    {r.status === 'OK' ? 'HEALTHY' : r.status === 'TIGHT' ? 'TIGHT' : r.status === 'DEPLETED' ? 'DEPLETED' : 'CRITICAL'}
                  </span>
                </div>
                <div className={styles.resBarsLayout}>
                  <div className={styles.resBarGroup}>
                    <span className={styles.resBarLabel}>DEMAND</span>
                    <div className={styles.resBarTrack}>
                      <div className={styles.resBarFill} style={{ width: `${demandPct}%`, background: '#E86F16' }} />
                    </div>
                    <span className={styles.resBarVal}>{r.demand.toLocaleString()} {r.unit}</span>
                  </div>
                  <div className={styles.resBarGroup}>
                    <span className={styles.resBarLabel}>AVAILABLE</span>
                    <div className={styles.resBarTrack}>
                      <div className={styles.resBarFill} style={{ width: `${availPct}%`, background: isGap || isDepleted ? '#DC2626' : '#059669' }} />
                    </div>
                    <span className={styles.resBarVal}>{r.available.toLocaleString()} {r.unit}</span>
                  </div>
                </div>
                <div className={styles.resGap}>
                  {isDepleted ? (
                    <span className={styles.resGapCrit}>⚠ DEPLETED — ZERO STOCK</span>
                  ) : isGap ? (
                    <span className={styles.resGapCrit}>GAP: {Math.abs(gap).toLocaleString()} {r.unit} SHORT</span>
                  ) : (
                    <span className={styles.resGapOk}>BUFFER: +{gap.toLocaleString()} {r.unit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ 6. PREDICTIVE RISK (DEMO MODEL) ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 05 · <span className={styles.demoTag}>PROJECTED — DEMO MODEL</span></span>
            <h2 className={styles.sectionTitle}>Predictive Risk</h2>
          </div>
          <p className={styles.sectionDesc}>Early indicators of where response pressure may increase over the next 2–4 hours.</p>
        </div>

        <div className={styles.riskGrid}>
          {PREDICTIVE_RISKS.map(r => {
            const delta = r.forecast - r.current;
            const riskColor = r.level === 'CRITICAL' ? '#DC2626' : r.level === 'HIGH' ? '#E86F16' : '#EAB308';
            return (
              <div key={r.zone} className={styles.riskCard}>
                <div className={styles.riskCardTop}>
                  <div>
                    <span className={styles.riskZone}>{r.zone}</span>
                    <span className={styles.riskType}>{r.type}</span>
                  </div>
                  <div className={styles.riskRight}>
                    <span className={styles.riskLevel} style={{ color: riskColor }}>{r.level}</span>
                    <span className={styles.riskTrend} style={{ color: riskColor }}>{r.trend}</span>
                  </div>
                </div>
                <div className={styles.riskMetrics}>
                  <div className={styles.riskMetricCell}>
                    <span className={styles.riskMetricNum}>{r.current}%</span>
                    <span className={styles.riskMetricLabel}>CURRENT</span>
                  </div>
                  <div className={styles.riskArrow}>→</div>
                  <div className={styles.riskMetricCell}>
                    <span className={styles.riskMetricNum} style={{ color: riskColor }}>{r.forecast}%</span>
                    <span className={styles.riskMetricLabel}>PROJECTED +2H</span>
                  </div>
                  <div className={styles.riskMetricCell}>
                    <span className={styles.riskMetricNum} style={{ color: riskColor }}>+{delta}%</span>
                    <span className={styles.riskMetricLabel}>INCREASE</span>
                  </div>
                </div>
                <div className={styles.riskMeter}>
                  <div className={styles.riskMeterCurrent} style={{ width: `${r.current}%` }} />
                  <div className={styles.riskMeterForecast} style={{ width: `${r.forecast}%`, backgroundColor: riskColor }} />
                </div>
                <p className={styles.riskLabel}>{r.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ 7. SHELTER CAPACITY FORECAST ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 06 · <span className={styles.demoTag}>PROJECTED — DEMO MODEL</span></span>
            <h2 className={styles.sectionTitle}>Shelter Capacity Forecast</h2>
          </div>
          <p className={styles.sectionDesc}>Projected safe accommodation across the network over the next 4 hours.</p>
        </div>

        <div className={styles.shelterForecastLayout}>
          <div className={styles.shelterAlert}>
            <span className={styles.shelterAlertBadge}>⚠ ALERT</span>
            <p><strong>Akshardham</strong> is projected to reach <strong>100% critical capacity</strong> within 35 minutes. Redirect incoming demand to Dwarka immediately.</p>
          </div>

          <div className={styles.shelterChartBlock}>
            <div className={styles.shelterBarChart}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={shelterBarData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,33,25,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(11,33,25,0.3)" fontSize={10} tick={{ fontWeight: 700 }} />
                  <YAxis stroke="rgba(11,33,25,0.3)" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#FAF8F3', border: '1px solid rgba(11,33,25,0.1)', borderRadius: 4, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Occupied" stackId="a" fill="#21583F" />
                  <Bar dataKey="Available" stackId="a" fill="#D9D2C7" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.shelterForecastChart}>
              <span className={styles.forecastLabel}>CAPACITY FORECAST (+4H)</span>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={SHELTER_FORECAST_DATA} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,33,25,0.06)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(11,33,25,0.3)" fontSize={10} tick={{ fontWeight: 700 }} />
                  <YAxis stroke="rgba(11,33,25,0.3)" fontSize={10} domain={[0, 105]} />
                  <Tooltip contentStyle={{ background: '#FAF8F3', border: '1px solid rgba(11,33,25,0.1)', borderRadius: 4, fontSize: 12 }} />
                  <ReferenceLine y={95} stroke="#DC2626" strokeDasharray="4 3" label={{ value: 'CRITICAL', position: 'right', fontSize: 9, fill: '#DC2626' }} />
                  <ReferenceLine y={85} stroke="#E86F16" strokeDasharray="4 3" label={{ value: 'SAFE', position: 'right', fontSize: 9, fill: '#E86F16' }} />
                  <Line type="monotone" dataKey="rohini" name="Rohini" stroke="#21583F" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="akshardham" name="Akshardham" stroke="#DC2626" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="dwarka" name="Dwarka" stroke="#6366F1" strokeWidth={2} dot={false} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 8. FLEET PERFORMANCE ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 07</span>
            <h2 className={styles.sectionTitle}>Fleet Performance</h2>
          </div>
          <p className={styles.sectionDesc}>Operational fleet intelligence — mission status and field movement efficiency.</p>
        </div>

        <div className={styles.fleetLayout}>
          <div className={styles.fleetMetrics}>
            {[
              { num: vehicles.length, label: 'UNITS TRACKED' },
              { num: vehiclesOnMission, label: 'ACTIVE MISSIONS' },
              { num: vehicles.filter(v => v.status === 'AVAILABLE').length, label: 'AVAILABLE' },
            ].map(m => (
              <div key={m.label} className={styles.fleetMetricCell}>
                <span className={styles.fleetMetricNum}>{String(m.num).padStart(2,'0')}</span>
                <span className={styles.fleetMetricLabel}>{m.label}</span>
              </div>
            ))}
            <div className={styles.fleetMetricCell}>
              <span className={styles.fleetMetricNum}>14 MIN</span>
              <span className={styles.fleetMetricLabel}>AVG ETA</span>
            </div>
            <div className={styles.fleetMetricCell}>
              <span className={styles.fleetMetricNum}>67%</span>
              <span className={styles.fleetMetricLabel}>FLEET UTILIZATION</span>
            </div>
          </div>

          <div className={styles.fleetTable}>
            <div className={styles.fleetTableHead}>
              <span>VEHICLE</span>
              <span>MISSION</span>
              <span>STATUS</span>
              <span>ETA</span>
            </div>
            {vehicles.map(v => (
              <div key={v.id} className={styles.fleetTableRow}>
                <span className={styles.fleetVehId}>{v.id}</span>
                <span className={styles.fleetCargo}>{v.cargo || '— Standby'}</span>
                <span className={`${styles.fleetStatus} ${styles['fStatus_' + v.status]}`}>{v.status.replace('_', ' ')}</span>
                <span className={styles.fleetEta}>{v.etaMinutes ? `${v.etaMinutes} min` : v.status === 'AVAILABLE' ? '—' : '~20 min'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 9. BOTTLENECKS ══ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 08</span>
            <h2 className={styles.sectionTitle}>Current Bottlenecks</h2>
          </div>
          <p className={styles.sectionDesc}>Operational constraints that require immediate coordinator attention.</p>
        </div>

        <div className={styles.bottleneckList}>
          {BOTTLENECKS.map(b => (
            <div key={b.rank} className={`${styles.bottleneck} ${b.severity === 'CRITICAL' ? styles.bottleneckCritical : ''}`}>
              <div className={styles.bottleneckRank}>{b.rank}</div>
              <div className={styles.bottleneckBody}>
                <div className={styles.bottleneckHeader}>
                  <span className={styles.bottleneckTitle}>{b.title}</span>
                  <span className={`${styles.bottleneckSeverity} ${b.severity === 'CRITICAL' ? styles.sevCrit : styles.sevHigh}`}>{b.severity}</span>
                </div>
                <span className={styles.bottleneckLoc}>{b.location}</span>
                <p className={styles.bottleneckDetail}>{b.detail}</p>
                <div className={styles.recommendationBlock}>
                  <span className={styles.recLabel}>RECOMMENDATION</span>
                  <p className={styles.recText}>{b.recommendation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ 10. DECISION SUPPORT ══ */}
      <section className={`${styles.section} ${styles.sectionLast}`}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>SECTION 09</span>
            <h2 className={styles.sectionTitle}>Decision Support</h2>
          </div>
          <p className={styles.sectionDesc}>Recommended actions based on current operational conditions. Not autonomous commands — for coordinator review and approval.</p>
        </div>

        <div className={styles.decisionList}>
          {DECISIONS.map((d, i) => (
            <div key={d.rank} className={styles.decisionCard} style={{ animationDelay: `${i * 120}ms` }}>
              <div className={styles.decisionTop}>
                <span className={styles.decisionRank}>{d.rank}</span>
                <span className={`${styles.decisionPriority} ${d.priority.startsWith('HIGH') ? styles.decPriHigh : styles.decPriMed}`}>{d.priority}</span>
              </div>
              <p className={styles.decisionAction}>{d.action}</p>
              <div className={styles.decisionImpact}>
                <span className={styles.impactLabel}>IMPACT</span>
                <span className={styles.impactText}>{d.impact}</span>
              </div>
              <button className={styles.decisionBtn}>{d.btn} →</button>
            </div>
          ))}
        </div>

        <div className={styles.decisionDisclaimer}>
          RECOMMENDED ACTIONS — These are system-generated suggestions based on live operational data. All dispatch and allocation decisions require coordinator approval. SAKSHAM does not command field operations autonomously.
        </div>
      </section>

    </div>
  );
};

export default Analytics;
