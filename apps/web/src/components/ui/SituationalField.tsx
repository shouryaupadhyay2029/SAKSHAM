import React, { useEffect, useState, useRef } from 'react';
import styles from './SituationalField.module.css';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'incident' | 'vehicle' | 'team' | 'stock' | 'shelter';
  status?: string;
  details?: string;
}

const ILLUSTRATIVE_NODES: Node[] = [
  { id: 'inc-01', label: 'INCIDENT: FLOOD', x: 200, y: 180, type: 'incident', status: 'CRITICAL', details: 'South Delhi Block D - Rising water levels' },
  { id: 'res-01', label: 'VEHICLE 04', x: 80, y: 100, type: 'vehicle', status: 'STANDBY', details: 'Heavy Transport Truck - Available' },
  { id: 'res-02', label: 'NDRF TEAM', x: 320, y: 80, type: 'team', status: 'STANDBY', details: 'Rescue Battalion B - Available' },
  { id: 'res-03', label: 'RELIEF STOCK', x: 90, y: 260, type: 'stock', status: 'RESERVED', details: '500 Blankets & Food Kits - Match Confirmed' },
  { id: 'res-04', label: 'SHELTER A', x: 310, y: 280, type: 'shelter', status: 'OPEN', details: 'Lajpat Nagar Shelter - Capacity 85%' },
];

export const SituationalField: React.FC = () => {
  const [animState, setAnimState] = useState<'MONITORING' | 'DETECTED' | 'CLASSIFIED' | 'MATCHING' | 'RESOLVED'>('MONITORING');
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [pulseScale, setPulseScale] = useState(1);
  const [secPulse, setSecPulse] = useState(1);
  const [timeStr, setTimeStr] = useState('');
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Time generator for the telemetry display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Motion preference detection
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(media.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  // Main system thinking state loop
  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimState('RESOLVED');
      return;
    }

    const stateSequence = [
      { state: 'MONITORING' as const, duration: 4000 },
      { state: 'DETECTED' as const, duration: 2500 },
      { state: 'CLASSIFIED' as const, duration: 3000 },
      { state: 'MATCHING' as const, duration: 4000 },
      { state: 'RESOLVED' as const, duration: 5000 },
    ];

    let currentIndex = 0;
    let timeoutId: number;

    const runNextState = () => {
      const current = stateSequence[currentIndex];
      setAnimState(current.state);
      timeoutId = window.setTimeout(() => {
        currentIndex = (currentIndex + 1) % stateSequence.length;
        runNextState();
      }, current.duration);
    };

    runNextState();
    return () => clearTimeout(timeoutId);
  }, [prefersReducedMotion]);

  // Subtle requestAnimationFrame loop for micro-movements (ticks/pulses)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      
      // Pulse animation logic
      setPulseScale(1 + Math.sin(elapsed * 0.005) * 0.08);
      setSecPulse(1.5 + Math.sin(elapsed * 0.003) * 0.5);

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [prefersReducedMotion]);



  return (
    <div className={styles.container}>
      {/* Telemetry Header */}
      <div className={styles.telemetryHeader}>
        <div className={styles.tmCol}>
          <span className={styles.tmLabel}>SYSTEM STATUS</span>
          <span className={styles.tmVal}>
            <span className={styles.pulseDot} />
            {animState === 'MONITORING' ? 'MONITORING L2' : 'RESPONSE ORCHESTRATION'}
          </span>
        </div>
        <div className={styles.tmCol}>
          <span className={styles.tmLabel}>EOC LOC TIME</span>
          <span className={styles.tmVal} style={{ fontFamily: 'monospace' }}>{timeStr || '12:00:00'}</span>
        </div>
        <div className={styles.tmCol}>
          <span className={styles.tmLabel}>RESOLVING ENGINE</span>
          <span className={styles.tmVal}>SAKSHAM-GRID.V2</span>
        </div>
      </div>

      {/* Main Orchestration Field */}
      <div className={styles.visualField}>
        {/* Subtle grid background overlay */}
        <div className={styles.gridOverlay} />
        
        <svg viewBox="0 0 400 360" className={styles.svgCanvas}>
          {/* Compass grid rings */}
          <circle cx="200" cy="180" r="140" className={styles.gridRing} />
          <circle cx="200" cy="180" r="80" className={styles.gridRing} />
          <line x1="200" y1="20" x2="200" y2="340" className={styles.gridLine} />
          <line x1="40" y1="180" x2="360" y2="180" className={styles.gridLine} />

          {/* Coordinate ticks */}
          <text x="205" y="30" className={styles.coordText}>N 28° 34'</text>
          <text x="320" y="175" className={styles.coordText}>E 77° 12'</text>

          {/* Paths connecting central incident to resources */}
          {ILLUSTRATIVE_NODES.map((node) => {
            if (node.type === 'incident') return null;
            const inc = ILLUSTRATIVE_NODES[0];
            const isTargetMatched = node.type === 'vehicle' || node.type === 'team' || node.type === 'stock';
            
            // Generate path strings
            const isEmphasized = isTargetMatched && (animState === 'MATCHING' || animState === 'RESOLVED');
            const strokeDash = isEmphasized ? 'none' : '3, 3';
            
            return (
              <g key={`path-${node.id}`}>
                <path
                  d={`M ${inc.x} ${inc.y} Q ${(inc.x + node.x) / 2 + 10} ${(inc.y + node.y) / 2 - 10} ${node.x} ${node.y}`}
                  className={`${styles.connectionPath} ${isEmphasized ? styles.emphasizedPath : ''}`}
                  strokeDasharray={strokeDash}
                  style={{
                    strokeDashoffset: animState === 'MATCHING' ? '-20' : '0',
                    opacity: animState === 'MONITORING' ? 0.05 : (isTargetMatched ? 0.7 : 0.2)
                  }}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {ILLUSTRATIVE_NODES.map((node) => {
            const isIncident = node.type === 'incident';
            const isMatchedRes = node.type === 'vehicle' || node.type === 'team' || node.type === 'stock';
            
            // Determine visibility and visual states of nodes based on engine phase
            let opacityVal = 0.85;
            let scaleVal = 1;
            
            if (isIncident) {
              opacityVal = animState === 'MONITORING' ? 0.35 : 1;
              scaleVal = animState === 'MONITORING' ? 0.9 : pulseScale;
            } else {
              if (animState === 'MONITORING') opacityVal = 0.5;
              else if (animState === 'DETECTED') opacityVal = 0.3;
              else if (animState === 'CLASSIFIED') opacityVal = 0.4;
              else if (animState === 'MATCHING' || animState === 'RESOLVED') {
                opacityVal = isMatchedRes ? 1 : 0.25;
              }
            }

            return (
              <g
                key={node.id}
                className={styles.nodeGroup}
                onClick={() => setHoveredNode(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ opacity: opacityVal }}
              >
                {/* Outer radial rings for active pulses */}
                {isIncident && animState === 'DETECTED' && (
                  <circle cx={node.x} cy={node.y} r={16 * secPulse} className={styles.incidentPulseRing} />
                )}

                {/* Main Node Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isIncident ? 8 : 5}
                  className={`${styles.nodeCircle} ${styles[node.type]} ${
                    isMatchedRes && animState === 'RESOLVED' ? styles.matchedHighlight : ''
                  }`}
                  transform={`scale(${scaleVal})`}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />

                {/* Small indicator ticks around nodes */}
                {!isIncident && (
                  <circle cx={node.x} cy={node.y} r={9} className={styles.nodeBorderRing} />
                )}

                {/* Labels */}
                <text
                  x={node.x}
                  y={node.y + (isIncident ? -15 : 18)}
                  textAnchor="middle"
                  className={`${styles.nodeLabel} ${isIncident ? styles.incidentLabelText : ''}`}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic status panels (The System thinking display) */}
        <div className={styles.evaluatorPanel}>
          {animState === 'MONITORING' && (
            <div className={styles.panelMonitoring}>
              <span className={styles.panelTitle}>✓ SYSTEM READY</span>
              <p className={styles.panelDesc}>Monitoring risk streams &amp; satellite telemetry channels...</p>
            </div>
          )}

          {animState === 'DETECTED' && (
            <div className={`${styles.panelAlert} ${styles.pulseBgAlert}`}>
              <span className={styles.panelTitle}>⚠ ALERT: INCIDENT DETECTED</span>
              <p className={styles.panelDesc}>Evaluating geolocation data &amp; telemetry streams...</p>
            </div>
          )}

          {animState === 'CLASSIFIED' && (
            <div className={styles.panelClassification}>
              <div className={styles.badgeRow}>
                <span className={`${styles.classificationBadge} ${styles.badgeFlood}`}>FLOOD</span>
                <span className={`${styles.classificationBadge} ${styles.badgeHigh}`}>HIGH SEVERITY</span>
              </div>
              <span className={styles.panelTitle}>ZONE: SOUTH DELHI</span>
              <p className={styles.panelDesc}>Classifying signal properties. Calculating catchment metrics...</p>
            </div>
          )}

          {animState === 'MATCHING' && (
            <div className={styles.panelMatching}>
              <span className={styles.panelTitle}>ANALYZING RESPONSE OPTIONS...</span>
              <p className={styles.panelDesc}>Querying nearest dispatch assets &amp; NDRF personnel databases.</p>
              <div className={styles.progressBar}>
                <div className={styles.progressBarFill} />
              </div>
            </div>
          )}

          {animState === 'RESOLVED' && (
            <div className={styles.panelResolved}>
              <span className={styles.panelTitle}>✓ RESPONSE OPTION MATCHED</span>
              <div className={styles.matchStats}>
                <span>Asset: <strong>VEHICLE 04</strong></span>
                <span>Team: <strong>NDRF BATTALION B</strong></span>
                <span>Relief: <strong>RELIEF STOCK CONFIRMED</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Tooltips for interactive premium detail */}
        {hoveredNode && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(hoveredNode.x / 400) * 100}%`,
              top: `${(hoveredNode.y / 360) * 100 - 15}%`,
            }}
          >
            <strong>{hoveredNode.label}</strong>
            <span>{hoveredNode.details}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SituationalField;
