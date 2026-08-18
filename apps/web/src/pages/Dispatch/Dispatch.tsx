import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapView } from '../../components/map/MapView';
import { useOperationalState } from '../../context/OperationalStateContext';
import type { Vehicle } from '../../types/vehicle';
import type { IncidentType } from '../../types/incident';
import {
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  Compass
} from 'lucide-react';
import styles from './Dispatch.module.css';

import GradientBackground from '../../components/ui/noisy-gradient-backgrounds';

gsap.registerPlugin(ScrollTrigger);

// ─── Dispatch Types ──────────────────────────────────────────────────────────
export interface DispatchMission {
  id: string;
  requestId: string;
  vehicleId: string;
  status: 'AWAITING_DISPATCH' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'DELIVERED';
  destinationName: string;
  resourceType: string;
  quantity: number;
  unit: string;
  etaMinutes: number;
  operatorName: string;
  speedKmh: number;
  distanceKm: number;
  signalStrength: number;
  fuelPct: number;
  trafficLevel: 'LOW' | 'MODERATE' | 'HEAVY' | 'BLOCKED';
  routePath: string[];
  alertMessage?: string;
  timeline: { time: string; title: string; done: boolean }[];
}

const INITIAL_MISSIONS: DispatchMission[] = [
  {
    id: 'DSP-DEL-041',
    requestId: 'REQ-DEL-101',
    vehicleId: 'VEH-BT-401',
    status: 'EN_ROUTE',
    destinationName: 'Yamuna Bank Inundation Area, East Delhi',
    resourceType: 'Clean Drinking Water',
    quantity: 12000,
    unit: 'Liters',
    etaMinutes: 18,
    operatorName: 'Sgt. Harish Negi',
    speedKmh: 45,
    distanceKm: 6.2,
    signalStrength: 98,
    fuelPct: 72,
    trafficLevel: 'MODERATE',
    routePath: ['East Delhi Relief Depot', 'NH-24 Bypass', 'Yamuna Bank Crossing', 'Flood Relief Zone'],
    timeline: [
      { time: '10:42', title: 'ALLOCATION APPROVED', done: true },
      { time: '10:47', title: 'VEHICLE ASSIGNED', done: true },
      { time: '10:51', title: 'DISPATCH AUTHORIZED', done: true },
      { time: '10:53', title: 'EN ROUTE TO TARGET', done: true },
      { time: '--:--', title: 'DESTINATION ARRIVAL', done: false },
      { time: '--:--', title: 'CARGO DELIVERY VERIFIED', done: false }
    ]
  },
  {
    id: 'DSP-DEL-042',
    requestId: 'REQ-DEL-103',
    vehicleId: 'VEH-TR-102',
    status: 'DISPATCHED',
    destinationName: 'Okhla Structural Collapse, South-East Delhi',
    resourceType: 'Heavy Resuscitation & Rescue Tools',
    quantity: 4,
    unit: 'Sets',
    etaMinutes: 25,
    operatorName: 'Constable Baldev Singh',
    speedKmh: 55,
    distanceKm: 9.4,
    signalStrength: 94,
    fuelPct: 88,
    trafficLevel: 'HEAVY',
    routePath: ['South Depot Central', 'Outer Ring Road', 'Okhla Phase III', 'Collapse Site'],
    alertMessage: 'TRAFFIC DELAY: Construction alert near Govindpuri.',
    timeline: [
      { time: '11:15', title: 'ALLOCATION APPROVED', done: true },
      { time: '11:19', title: 'VEHICLE ASSIGNED', done: true },
      { time: '11:22', title: 'DISPATCH AUTHORIZED', done: true },
      { time: '--:--', title: 'EN ROUTE TO TARGET', done: false },
      { time: '--:--', title: 'DESTINATION ARRIVAL', done: false },
      { time: '--:--', title: 'CARGO DELIVERY VERIFIED', done: false }
    ]
  },
  {
    id: 'DSP-DEL-043',
    requestId: 'REQ-DEL-102',
    vehicleId: 'VEH-AM-201',
    status: 'ARRIVED',
    destinationName: 'Karol Bagh Fire Zone, Central-West Delhi',
    resourceType: 'Emergency Medical Kits',
    quantity: 50,
    unit: 'Kits',
    etaMinutes: 0,
    operatorName: 'Naresh Kumar',
    speedKmh: 0,
    distanceKm: 0,
    signalStrength: 92,
    fuelPct: 65,
    trafficLevel: 'LOW',
    routePath: ['Dr. RML Hospital Depot', 'Pusa Road', 'Karol Bagh Metro Loop', 'Fire Zone Depot'],
    timeline: [
      { time: '11:02', title: 'ALLOCATION APPROVED', done: true },
      { time: '11:05', title: 'VEHICLE ASSIGNED', done: true },
      { time: '11:09', title: 'DISPATCH AUTHORIZED', done: true },
      { time: '11:12', title: 'EN ROUTE TO TARGET', done: true },
      { time: '11:25', title: 'DESTINATION ARRIVAL', done: true },
      { time: '--:--', title: 'CARGO DELIVERY VERIFIED', done: false }
    ]
  }
];

const HISTORY_MISSIONS = [
  { id: 'DSP-DEL-038', status: 'DELIVERED', dest: 'Rohini Sector 15 Shelter', resource: '500 blankets', time: '11:02' },
  { id: 'DSP-DEL-039', status: 'DELIVERED', dest: 'Okhla Collapse Site', resource: 'Heavy tools', time: '10:54' },
  { id: 'DSP-DEL-040', status: 'DELIVERED', dest: 'Lajpat Nagar Camp', resource: 'Portable water', time: '10:48' }
];

export const Dispatch: React.FC = () => {
  const { requests, vehicles, setVehicles, setRequests } = useOperationalState();

  const [missions, setMissions] = useState<DispatchMission[]>(INITIAL_MISSIONS);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('DSP-DEL-041');
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // New Dispatch Form State
  const [formAllocationId, setFormAllocationId] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formOperator, setFormOperator] = useState('Sgt. Amit Sharma');

  // Refs for animations
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Get active mission
  const activeMission = useMemo(() => {
    return missions.find(m => m.id === selectedMissionId) || missions[0] || null;
  }, [missions, selectedMissionId]);

  // Find requests with status 'ALLOCATED' to show in the dropdown for creating dispatches
  const allocationsAwaitingDispatch = useMemo(() => {
    return requests.filter(r => r.status === 'ALLOCATED');
  }, [requests]);

  // Filter compatible and available vehicles
  const compatibleVehicles = useMemo(() => {
    return vehicles.filter(v => v.status === 'AVAILABLE');
  }, [vehicles]);

  // Sync state back to global operational context for mock integration
  const syncMissionsToGlobalContext = useCallback((updatedMissions: DispatchMission[]) => {
    // Sync request statuses
    setRequests(prev => prev.map(req => {
      const match = updatedMissions.find(m => m.requestId === req.id);
      if (match) {
        let status = req.status;
        if (match.status === 'DELIVERED') status = 'FULFILLED';
        else if (match.status === 'ARRIVED') status = 'FULFILLING';
        else if (match.status === 'EN_ROUTE' || match.status === 'DISPATCHED') status = 'DISPATCHED';
        return { ...req, status };
      }
      return req;
    }));

    // Sync vehicle locations and destinations
    setVehicles(prev => prev.map(veh => {
      const match = updatedMissions.find(m => m.vehicleId === veh.id);
      if (match) {
        let status = veh.status;
        if (match.status === 'EN_ROUTE') status = 'EN_ROUTE';
        else if (match.status === 'DISPATCHED') status = 'DISPATCHED';
        else if (match.status === 'ARRIVED') status = 'ARRIVED';
        else if (match.status === 'DELIVERED') status = 'AVAILABLE';
        
        // Find destination coordinates from requests
        const reqObj = requests.find(r => r.id === match.requestId);
        return {
          ...veh,
          status,
          destination: reqObj?.coordinates,
          cargo: `${match.quantity.toLocaleString()} ${match.unit} ${match.resourceType}`
        };
      }
      return veh;
    }));
  }, [requests, setRequests, setVehicles]);

  // Trigger sync once on mount
  useEffect(() => {
    syncMissionsToGlobalContext(INITIAL_MISSIONS);
  }, []); // Run once on mount to avoid infinite rendering loop

  // Calculations for summary tiles
  const summaryStats = useMemo(() => {
    const active = missions.filter(m => m.status !== 'DELIVERED').length;
    const awaiting = allocationsAwaitingDispatch.length;
    const enroute = missions.filter(m => m.status === 'EN_ROUTE').length;
    const arriving = missions.filter(m => m.status === 'ARRIVED').length;
    return { active, awaiting, enroute, arriving };
  }, [missions, allocationsAwaitingDispatch]);

  // ─── GSAP Entrance Animations ──────────────────────────────────────────────
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(heroRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 0)
        .fromTo(`.${styles.summaryTile}`, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, 0.25)
        .fromTo(workspaceRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.65 }, 0.45);
    }, pageRef);

    return () => ctx.revert();
  }, []);

  // Update Status Action Handler
  const handleUpdateStatus = () => {
    if (!activeMission) return;
    const order: DispatchMission['status'][] = ['AWAITING_DISPATCH', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'DELIVERED'];
    const currentIndex = order.indexOf(activeMission.status);
    if (currentIndex === -1 || currentIndex === order.length - 1) return;
    
    const nextStatus = order[currentIndex + 1];
    
    const updated = missions.map(m => {
      if (m.id !== activeMission.id) return m;
      
      const newTimeline = [...m.timeline];
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
      });
      
      // Update matching timeline item
      if (nextStatus === 'DISPATCHED') {
        newTimeline[2] = { time: timeStr, title: 'DISPATCH AUTHORIZED', done: true };
      } else if (nextStatus === 'EN_ROUTE') {
        newTimeline[3] = { time: timeStr, title: 'EN ROUTE TO TARGET', done: true };
      } else if (nextStatus === 'ARRIVED') {
        newTimeline[4] = { time: timeStr, title: 'DESTINATION ARRIVAL', done: true };
      } else if (nextStatus === 'DELIVERED') {
        newTimeline[5] = { time: timeStr, title: 'CARGO DELIVERY VERIFIED', done: true };
      }
      
      return {
        ...m,
        status: nextStatus,
        timeline: newTimeline,
        speedKmh: nextStatus === 'DELIVERED' ? 0 : m.speedKmh,
        distanceKm: nextStatus === 'ARRIVED' || nextStatus === 'DELIVERED' ? 0 : m.distanceKm,
        etaMinutes: nextStatus === 'ARRIVED' || nextStatus === 'DELIVERED' ? 0 : m.etaMinutes
      };
    });

    setMissions(updated);
    syncMissionsToGlobalContext(updated);
  };

  // Re-route Action Handler (Trigger Alternative Route)
  const handleReroute = () => {
    if (!activeMission) return;
    setMissions(prev => prev.map(m => {
      if (m.id !== activeMission.id) return m;
      return {
        ...m,
        trafficLevel: 'LOW',
        etaMinutes: m.etaMinutes + 4,
        distanceKm: m.distanceKm + 1.2,
        routePath: [m.routePath[0], 'Ring Road Alternative', ...m.routePath.slice(2)],
        alertMessage: undefined
      };
    }));
  };

  // Create Dispatch Handler
  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAllocationId || !formVehicleId) return;

    const request = requests.find(r => r.id === formAllocationId);
    const vehicle = vehicles.find(v => v.id === formVehicleId);

    if (!request || !vehicle) return;

    const newMissionId = `DSP-DEL-0${missions.length + 41}`;
    const newMission: DispatchMission = {
      id: newMissionId,
      requestId: request.id,
      vehicleId: vehicle.id,
      status: 'DISPATCHED',
      destinationName: request.zoneName,
      resourceType: request.itemNeeded,
      quantity: request.quantity,
      unit: request.unit,
      etaMinutes: 22,
      operatorName: formOperator,
      speedKmh: 50,
      distanceKm: 8.5,
      signalStrength: 95,
      fuelPct: 90,
      trafficLevel: 'LOW',
      routePath: ['Central Command Depot', 'Ring Road Bypass', request.zoneName.split(',')[0]],
      timeline: [
        { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), title: 'ALLOCATION APPROVED', done: true },
        { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), title: 'VEHICLE ASSIGNED', done: true },
        { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), title: 'DISPATCH AUTHORIZED', done: true },
        { time: '--:--', title: 'EN ROUTE TO TARGET', done: false },
        { time: '--:--', title: 'DESTINATION ARRIVAL', done: false },
        { time: '--:--', title: 'CARGO DELIVERY VERIFIED', done: false }
      ]
    };

    const updatedMissions = [newMission, ...missions];
    setMissions(updatedMissions);
    syncMissionsToGlobalContext(updatedMissions);
    setSelectedMissionId(newMissionId);
    setShowCreatePanel(false);
    setFormAllocationId('');
    setFormVehicleId('');
  };

  // Convert selected mission properties to draw lines on map
  const activeVehicle = useMemo(() => {
    if (!activeMission) return null;
    return vehicles.find(v => v.id === activeMission.vehicleId) || null;
  }, [activeMission, vehicles]);

  const mapVehicles = useMemo<Vehicle[]>(() => {
    if (!activeVehicle || !activeMission) return [];
    
    // Create temporary coordinates based on the status for routing rendering
    let destCoords: any = undefined;
    const reqObj = requests.find(r => r.id === activeMission.requestId);
    if (reqObj) {
      destCoords = reqObj.coordinates;
    }

    return [{
      ...activeVehicle,
      status: activeMission.status === 'DELIVERED' ? 'AVAILABLE' : (activeMission.status === 'ARRIVED' ? 'ARRIVED' : 'EN_ROUTE'),
      destination: destCoords
    }];
  }, [activeVehicle, activeMission, requests]);

  const mapIncidents = useMemo(() => {
    if (!activeMission) return [];
    const reqObj = requests.find(r => r.id === activeMission.requestId);
    if (!reqObj?.incidentId) return [];
    const incidentObj = requests.find(r => r.id === activeMission.requestId);
    return incidentObj ? [{
      id: reqObj.incidentId,
      type: 'RESOURCE_SHORTAGE' as IncidentType,
      severity: 'CRITICAL' as const,
      location: reqObj.zoneName,
      coordinates: reqObj.coordinates,
      time: new Date().toISOString(),
      status: 'UNDER_RESPONSE' as const,
      assignedTeam: 'NDRF TEAM ALPHA',
      description: `Target for dispatch allocation.`,
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'COMMAND CENTER',
      peopleAffected: reqObj.affectedCount,
      requiredResources: [],
      reporterName: 'Control Operator',
      reporterContact: 'Internal Line'
    }] : [];
  }, [activeMission, requests]);

  return (
    <div ref={pageRef} className={styles.page}>
      <GradientBackground />
      
      {/* ── Page Hero ── */}
      <header ref={heroRef} className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>LOGISTICS EXECUTION</span>
          <h1 className={styles.heroTitle}>Dispatch &amp; Logistics</h1>
          <p className={styles.heroLead}>
            Coordinate approved resource allocations, field vehicles, routes, and live response missions from dispatch to arrival.
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDotPulse} />
            <span className={styles.statusLabel}>OPERATIONS ONLINE</span>
          </div>
          <span className={styles.statusDetails}>
            {summaryStats.active} active missions · {summaryStats.awaiting} awaiting dispatch
          </span>
        </div>
      </header>

      {/* ── Operational Summary Row ── */}
      <section ref={summaryRef} className={styles.summarySection}>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryTile}>
            <span className={styles.summaryNum}>{String(summaryStats.active).padStart(2, '0')}</span>
            <span className={styles.summaryLabel}>Active Missions</span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryNum}>{String(summaryStats.awaiting).padStart(2, '0')}</span>
            <span className={styles.summaryLabel}>Awaiting Dispatch</span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryNum}>{String(summaryStats.enroute).padStart(2, '0')}</span>
            <span className={styles.summaryLabel}>En Route</span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryNum}>{String(summaryStats.arriving).padStart(2, '0')}</span>
            <span className={styles.summaryLabel}>Arrived</span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryNum}>88%</span>
            <span className={styles.summaryLabel}>On-Time Rate</span>
          </div>
        </div>
      </section>

      {/* ── Main Workspace ── */}
      <div ref={workspaceRef} className={styles.workspace}>
        
        {/* Left Column: Map */}
        <div className={styles.leftCol}>
          <div className={styles.mapHeader}>
            <div className={styles.mapTitleBlock}>
              <span className={styles.mapTitle}>LIVE DISPATCH MAP</span>
              <span className={styles.mapSubtitle}>DELHI REGION</span>
            </div>
            <div className={styles.mapSyncBlock}>
              <span className={styles.mapPulse} />
              <span className={styles.mapSyncLabel}>LIVE GPS TELEMETRY</span>
            </div>
          </div>
          <div className={styles.mapContainer}>
            <MapView
              incidents={mapIncidents}
              resources={[]}
              vehicles={mapVehicles}
              shelters={[]}
              layerFilters={{
                incidents: true,
                resources: false,
                vehicles: true,
                shelters: false,
                routes: true
              }}
            />
          </div>
          
          {/* Action Area below Map */}
          {activeMission && (
            <div className={styles.actionWorkspace}>
              <div className={styles.actionHeader}>
                <span className={styles.actionEyebrow}>MISSION CONTROL ACTIONS</span>
                <span className={styles.actionStatusLabel}>Current State: <strong>{activeMission.status.replace(/_/g, ' ')}</strong></span>
              </div>
              <div className={styles.actionButtons}>
                {activeMission.status === 'DISPATCHED' && (
                  <button className={styles.primaryActionBtn} onClick={handleUpdateStatus}>
                    AUTHORIZE DEPARTURE (EN ROUTE) <ArrowRight size={13} />
                  </button>
                )}
                {activeMission.status === 'EN_ROUTE' && (
                  <button className={styles.primaryActionBtn} onClick={handleUpdateStatus}>
                    CONFIRM TARGET ARRIVAL <ArrowRight size={13} />
                  </button>
                )}
                {activeMission.status === 'ARRIVED' && (
                  <button className={styles.primaryActionBtn} onClick={handleUpdateStatus}>
                    CONFIRM CARGO DELIVERY &amp; COMPLETE <CheckCircle size={13} />
                  </button>
                )}
                {activeMission.status === 'DELIVERED' && (
                  <div className={styles.completedBanner}>
                    <Check size={14} /> Mission Completed &amp; Cargo Handover Verified.
                  </div>
                )}
                
                {activeMission.status !== 'DELIVERED' && activeMission.trafficLevel === 'BLOCKED' && (
                  <button className={styles.alertActionBtn} onClick={handleReroute}>
                    REROUTE MISSION NOW <Compass size={13} />
                  </button>
                )}

                <button className={styles.secondaryActionBtn} onClick={() => {
                  setSelectedMissionId(activeMission.id);
                  setShowCreatePanel(true);
                }}>
                  + NEW DISPATCH
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Mission Details & Queue */}
        <div className={styles.rightCol}>
          
          {/* Active Missions Queue list */}
          <div className={styles.missionQueueSection}>
            <div className={styles.mqHeader}>
              <span className={styles.mqEyebrow}>ACTIVE MISSIONS</span>
              <button className={styles.mqCreateBtn} onClick={() => setShowCreatePanel(true)}>
                + CREATE DISPATCH
              </button>
            </div>
            
            <div className={styles.missionList}>
              {missions.map(m => {
                const isActive = m.id === selectedMissionId;
                return (
                  <button
                    key={m.id}
                    className={`${styles.missionRow} ${isActive ? styles.missionRowActive : ''}`}
                    onClick={() => setSelectedMissionId(m.id)}
                  >
                    <div className={styles.mrLeft}>
                      <span className={styles.mrId}>{m.id}</span>
                      <span className={`${styles.mrStatusBadge} ${styles['status_' + m.status]}`}>
                        {m.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className={styles.mrDetails}>
                      <span className={styles.mrTarget}>{m.destinationName.split(',')[0]}</span>
                      <span className={styles.mrCargo}>{m.quantity.toLocaleString()} {m.unit} {m.resourceType}</span>
                    </div>
                    <div className={styles.mrRight}>
                      <span className={styles.mrEtaLabel}>ETA</span>
                      <span className={styles.mrEtaVal}>{m.etaMinutes > 0 ? `${m.etaMinutes}m` : 'ARRIVED'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Context Panel */}
          {activeMission && (
            <div ref={detailRef} className={styles.detailPanel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>MISSION DETAILS</span>
                <span className={styles.panelId}>{activeMission.id}</span>
              </div>

              {activeMission.alertMessage && (
                <div className={styles.operationalAlert}>
                  <AlertTriangle size={14} className={styles.alertIcon} />
                  <div className={styles.alertTextBlock}>
                    <strong>ALERT RESOLUTION REQUIRED</strong>
                    <span>{activeMission.alertMessage}</span>
                  </div>
                  {activeMission.trafficLevel === 'HEAVY' && (
                    <button className={styles.alertSolveBtn} onClick={handleReroute}>
                      REROUTE
                    </button>
                  )}
                </div>
              )}

              <div className={styles.detailGrid}>
                <div>
                  <span className={styles.detailLabel}>RESOURCE TYPE</span>
                  <span className={styles.detailVal}>{activeMission.resourceType}</span>
                </div>
                <div>
                  <span className={styles.detailLabel}>QUANTITY DISPATCHED</span>
                  <span className={styles.detailVal}>{activeMission.quantity.toLocaleString()} {activeMission.unit}</span>
                </div>
                <div>
                  <span className={styles.detailLabel}>VEHICLE FLEET UNIT</span>
                  <span className={styles.detailVal}>{activeMission.vehicleId}</span>
                </div>
                <div>
                  <span className={styles.detailLabel}>ASSIGNED OPERATOR</span>
                  <span className={styles.detailVal}>{activeMission.operatorName}</span>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className={styles.timelineSection}>
                <span className={styles.panelEyebrow}>MISSION TIMELINE</span>
                <div className={styles.timeline}>
                  {activeMission.timeline.map((step, idx) => (
                    <div key={idx} className={`${styles.timelineStep} ${step.done ? styles.stepDone : ''}`}>
                      <div className={styles.stepCircle}>
                        {step.done && <Check size={8} />}
                      </div>
                      <div className={styles.stepContent}>
                        <span className={styles.stepTitle}>{step.title}</span>
                        <span className={styles.stepTime}>{step.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Route Path list */}
              <div className={styles.routeSection}>
                <span className={styles.panelEyebrow}>APPROVED ROUTE PATH</span>
                <div className={styles.routePath}>
                  {activeMission.routePath.map((stop, idx) => (
                    <div key={idx} className={styles.routeStop}>
                      {idx > 0 && <span className={styles.routeArrow}>↓</span>}
                      <span className={styles.routeStopName}>{stop}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vehicle Telemetry stats */}
              <div className={styles.telemetrySection}>
                <span className={styles.panelEyebrow}>VEHICLE TELEMETRY</span>
                <div className={styles.telemetryGrid}>
                  <div>
                    <span className={styles.teleLabel}>SPEED</span>
                    <span className={styles.teleVal}>{activeMission.speedKmh} km/h</span>
                  </div>
                  <div>
                    <span className={styles.teleLabel}>HEADING</span>
                    <span className={styles.teleVal}><Compass size={10} style={{ display: 'inline', marginRight: 2 }} /> SE 124°</span>
                  </div>
                  <div>
                    <span className={styles.teleLabel}>DISTANCE REMAINING</span>
                    <span className={styles.teleVal}>{activeMission.distanceKm} km</span>
                  </div>
                  <div>
                    <span className={styles.teleLabel}>SIGNAL STRENGTH</span>
                    <span className={styles.teleVal}>{activeMission.signalStrength}%</span>
                  </div>
                  <div>
                    <span className={styles.teleLabel}>FUEL / BATTERY</span>
                    <span className={styles.teleVal} style={{ color: activeMission.fuelPct < 30 ? '#C0392B' : undefined }}>{activeMission.fuelPct}%</span>
                  </div>
                  <div>
                    <span className={styles.teleLabel}>ROUTE STATUS</span>
                    <span className={styles.teleVal} style={{ color: activeMission.trafficLevel === 'BLOCKED' ? '#C0392B' : undefined }}>
                      {activeMission.trafficLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Dispatch Side Panel ── */}
      {showCreatePanel && (
        <div className={styles.panelOverlay}>
          <div className={styles.createPanel}>
            <div className={styles.cpHeader}>
              <h3>AUTHORIZE DISPATCH MISSION</h3>
              <button className={styles.cpCloseBtn} onClick={() => setShowCreatePanel(false)}>
                <X size={15} />
              </button>
            </div>
            
            <form onSubmit={handleCreateDispatch} className={styles.cpForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SELECT APPROVED ALLOCATION</label>
                <select
                  value={formAllocationId}
                  onChange={e => setFormAllocationId(e.target.value)}
                  required
                >
                  <option value="">-- Choose allocation --</option>
                  {allocationsAwaitingDispatch.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.id} - {a.quantity.toLocaleString()} {a.unit} {a.itemNeeded} to {a.zoneName.split(',')[0]}
                    </option>
                  ))}
                  {/* Fallback to mock demands if registry list is empty for demo purpose */}
                  {allocationsAwaitingDispatch.length === 0 && (
                    <option value="DEMO-ALLOC">
                      [DEMO-ALLOC] 12,000 L Drinking Water to Yamuna Bank
                    </option>
                  )}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>SELECT COMPATIBLE VEHICLE</label>
                <select
                  value={formVehicleId}
                  onChange={e => setFormVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose vehicle --</option>
                  {compatibleVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.id} - {v.name} ({v.type} | Cap: {v.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>ASSIGN OPERATOR / TEAM LEAD</label>
                <input
                  type="text"
                  value={formOperator}
                  onChange={e => setFormOperator(e.target.value)}
                  required
                />
              </div>

              {/* Stock check & Verification Preview */}
              {formAllocationId && (
                <div className={styles.stockVerification}>
                  <div className={styles.verificationRow}>
                    <span>✓ STOCK ALLOCATION VERIFIED</span>
                    <span className={styles.verificationOk}>READY</span>
                  </div>
                  <div className={styles.verificationPreview}>
                    <p><strong>MISSION SUMMARY</strong></p>
                    <p>Resource: 12,000 L Clean Drinking Water</p>
                    <p>Target Zone: Yamuna Bank Floodplain</p>
                    <p>Fleet Code: VEH-BT-401 (NDRF supply boat)</p>
                    <p>ETA: ~18 mins (Route via Canal link)</p>
                  </div>
                </div>
              )}

              <div className={styles.cpActions}>
                <button type="button" className={styles.cpCancelBtn} onClick={() => setShowCreatePanel(false)}>
                  CANCEL
                </button>
                <button type="submit" className={styles.cpSubmitBtn}>
                  AUTHORIZE DISPATCH →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dispatch History Section ── */}
      <section className={styles.historySection}>
        <div className={styles.historyHeader}>
          <span className={styles.historyEyebrow}>RECENT MISSION HISTORY</span>
        </div>
        <div className={styles.historyGrid}>
          {HISTORY_MISSIONS.map(h => (
            <div key={h.id} className={styles.historyCard}>
              <div className={styles.hcHeader}>
                <span className={styles.hcId}>{h.id}</span>
                <span className={styles.hcStatus}>{h.status}</span>
              </div>
              <div className={styles.hcBody}>
                <p><strong>Destination:</strong> {h.dest}</p>
                <p><strong>Cargo payload:</strong> {h.resource}</p>
                <span className={styles.hcTimestamp}>Delivered at {h.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission Lifecycle Section ── */}
      <section className={styles.lifecycleSection}>
        <div className={styles.lcTitleBlock}>
          <span className={styles.lcEyebrow}>MISSION LIFECYCLE</span>
          <h2 className={styles.lcTitle}>SAKSHAM Dispatch Execution Pipeline</h2>
        </div>
        <div className={styles.lcPipeline}>
          {[
            { step: 'ALLOCATED', label: 'Match engine commits stock resources.' },
            { step: 'DISPATCHED', label: 'Operator assigns logistics vehicle and departs.' },
            { step: 'EN ROUTE', label: 'Field telemetry feeds real-time coordinates.' },
            { step: 'ARRIVED', label: 'Vehicle registers destination geo-fence arrival.' },
            { step: 'DELIVERED', label: 'Operator uploads relief handover certificate.' }
          ].map((l, idx) => (
            <div key={idx} className={styles.lcStep}>
              <div className={styles.lcCircle}>{idx + 1}</div>
              <strong className={styles.lcStepTitle}>{l.step}</strong>
              <span className={styles.lcStepDesc}>{l.label}</span>
            </div>
          ))}
        </div>
        <div className={styles.lcTransition}>
          <span>LIFECYCLE TARGET PIPELINE COMPLETE</span>
          <Link to="/operations/delivery" className={styles.lcLink}>
            CONTINUE TO DELIVERY VERIFICATION &rarr;
          </Link>
        </div>
      </section>
      
    </div>
  );
};

export default Dispatch;
