import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapView } from '../../components/map/MapView';
import type { Vehicle } from '../../types/vehicle';
import type { IncidentType } from '../../types/incident';
import {
  CheckCircle,
  ArrowRight,
  Check,
  X,
  Compass,
  AlertOctagon
} from 'lucide-react';
import styles from './Dispatch.module.css';

import GradientBackground from '../../components/ui/noisy-gradient-backgrounds';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';
import { ShaderBackground } from '../../components/ui/ShaderBackground';
gsap.registerPlugin(ScrollTrigger);

import { useTranslation } from 'react-i18next';
import { DynamicText } from '../../components/ui/DynamicText';
import { useOperationalState, type DispatchMission } from '../../context/OperationalStateContext';
import apiClient from '../../services/apiClient';
import { authService } from '../../services/authService';

const HISTORY_MISSIONS = [
  { id: 'DSP-DEL-038', status: 'DELIVERED', dest: 'Rohini Sector 15 Shelter', resource: '500 blankets', time: '11:02' },
  { id: 'DSP-DEL-039', status: 'DELIVERED', dest: 'Okhla Collapse Site', resource: 'Heavy tools', time: '10:54' },
  { id: 'DSP-DEL-040', status: 'DELIVERED', dest: 'Lajpat Nagar Camp', resource: 'Portable water', time: '10:48' }
];

export const Dispatch: React.FC = () => {
  const { t } = useTranslation();
  const { requests, vehicles, setVehicles, setRequests, missions, setMissions, deliveries, setDeliveries, addToast } = useOperationalState();
  const [selectedMissionId, setSelectedMissionId] = useState<string>('DSP-DEL-041');
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Dispatch Form State
  const [formAllocationId, setFormAllocationId] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formOperator, setFormOperator] = useState('Sgt. Amit Sharma');

  // Map Filter Layers State
  const [showVehicles, setShowVehicles] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

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

    setVehicles(prev => prev.map(veh => {
      const match = updatedMissions.find(m => m.vehicleId === veh.id);
      if (match) {
        let status = veh.status;
        if (match.status === 'EN_ROUTE') status = 'EN_ROUTE';
        else if (match.status === 'DISPATCHED') status = 'DISPATCHED';
        else if (match.status === 'ARRIVED') status = 'ARRIVED';
        else if (match.status === 'DELIVERED') status = 'AVAILABLE';
        
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
    syncMissionsToGlobalContext(missions);
  }, []);

  // Pre-fill from URL parameters if available
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const allocId = searchParams.get('allocationId');
    if (allocId) {
      setFormAllocationId(allocId);
      setShowCreatePanel(true);
      const availVeh = compatibleVehicles[0];
      if (availVeh) {
        setFormVehicleId(availVeh.id);
      }
    }
  }, [searchParams, compatibleVehicles]);

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

    // Call SAKSHAM backend to persist the state transition
    (async () => {
      try {
        const backendStatusMap: Record<string, string> = {
          'DISPATCHED': 'DISPATCHED',
          'EN_ROUTE': 'EN_ROUTE',
          'ARRIVED': 'ARRIVED',
          'DELIVERED': 'COMPLETED'
        };
        const nextBackendStatus = backendStatusMap[nextStatus];
        if (nextBackendStatus) {
          const currentUser = authService.getCurrentUser();
          await apiClient.updateDispatchStatus(activeMission.id, nextBackendStatus, undefined, currentUser?.id);
          console.log('[DISPATCH PIPELINE] Successfully updated dispatch status in PostgreSQL database.');
        }
      } catch (err: any) {
        console.error('[DISPATCH PIPELINE ERROR] Failed to update dispatch status on SAKSHAM backend:', err);
      }
    })();
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
    if (!formAllocationId || !formVehicleId || isSubmitting) return;

    const request = requests.find(r => r.id === formAllocationId);
    const vehicle = vehicles.find(v => v.id === formVehicleId);

    if (!request || !vehicle) {
      addToast('ERROR', 'INVALID DISPATCH DATA: The selected request or vehicle is not valid.');
      return;
    }

    if (vehicle.status !== 'AVAILABLE') {
      addToast('ERROR', 'VEHICLE NO LONGER AVAILABLE: This vehicle is currently assigned to another mission.');
      return;
    }

    setIsSubmitting(true);

    // Call SAKSHAM backend API to persist the dispatch record
    (async () => {
      try {
        // Find allocation record corresponding to this demand request
        const allocsRes = await apiClient.getAllocations({ demandId: request.id });
        const dbAllocationId = allocsRes.data?.[0]?.id;
        
        if (!dbAllocationId) {
          throw new Error(`No DB allocation found for Demand ID ${request.id}`);
        }

        const currentUser = authService.getCurrentUser();
        const plannedDeparture = new Date().toISOString();
        const eta = new Date(Date.now() + 22 * 60 * 1000).toISOString();

        const dispatchRes = await apiClient.createDispatch({
          allocationId: dbAllocationId,
          vehicleId: vehicle.id,
          assignedOfficerId: currentUser?.id || 'officer-1',
          plannedDeparture,
          eta,
          notes: 'Dispatched via SAKSHAM Optimization recommend recommendation'
        });

        if (dispatchRes && dispatchRes.data) {
          const dbDispatch = dispatchRes.data;
          const newMissionId = dbDispatch.dispatchId || dbDispatch.id;
          
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

          const newDeliveryId = `DEL-2026-0${deliveries.length + 81}`;
          const newDelivery = {
            id: newDeliveryId,
            dispatchId: newMissionId,
            demandId: request.id,
            incidentId: request.incidentId || '',
            resourceId: request.allocatedResourceId || '',
            vehicleId: vehicle.id,
            requestedQty: request.quantity,
            allocatedQty: request.quantity,
            deliveredQty: 0,
            unit: request.unit,
            status: 'PENDING' as const,
            resourceType: request.itemNeeded,
            destinationName: request.zoneName
          };
          setDeliveries(prev => [newDelivery, ...prev]);

          addToast('SUCCESS', `✓ Vehicle ${vehicle.id} dispatched successfully to coordinate zone.`);
          setSelectedMissionId(newMissionId);
          setShowCreatePanel(false);
          setFormAllocationId('');
          setFormVehicleId('');
        }
      } catch (err: any) {
        console.error('[DISPATCH PIPELINE ERROR] Failed to create persistent dispatch:', err);
        addToast('ERROR', `Failed to create dispatch: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  // Convert selected mission properties to draw lines on map
  const activeVehicle = useMemo(() => {
    if (!activeMission) return null;
    return vehicles.find(v => v.id === activeMission.vehicleId) || null;
  }, [activeMission, vehicles]);

  const mapVehicles = useMemo<Vehicle[]>(() => {
    if (!showVehicles || !activeVehicle || !activeMission) return [];
    
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
  }, [activeVehicle, activeMission, requests, showVehicles]);

  const mapIncidents = useMemo(() => {
    if (!showIncidents || !activeMission) return [];
    const reqObj = requests.find(r => r.id === activeMission.requestId);
    if (!reqObj?.incidentId) return [];
    return reqObj ? [{
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
  }, [activeMission, requests, showIncidents]);

  // Derived readiness stats for progress indicators
  const readinessCounts = useMemo(() => {
    const total = vehicles.length || 1;
    const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
    const enroute = vehicles.filter(v => v.status === 'EN_ROUTE' || v.status === 'DISPATCHED').length;
    const maintenance = vehicles.filter(v => v.status === 'MAINTENANCE').length;
    
    return {
      available,
      enroute,
      maintenance,
      availablePct: Math.round((available / total) * 100),
      enroutePct: Math.round((enroute / total) * 100),
      maintenancePct: Math.round((maintenance / total) * 100),
    };
  }, [vehicles]);

  // Derived details of selected allocation preview
  const selectedAllocationObj = useMemo(() => {
    return requests.find(r => r.id === formAllocationId) || null;
  }, [formAllocationId, requests]);

  const selectedVehicleObj = useMemo(() => {
    return vehicles.find(v => v.id === formVehicleId) || null;
  }, [formVehicleId, vehicles]);

  return (
    <div ref={pageRef} className={styles.page}>
      <GradientBackground />
      
      {/* ── Hero Section ── */}
      <header ref={heroRef} className={`${styles.hero} shaderHeaderWrapper`}>
        <ShaderBackground className="absolute inset-0" />
        <div className={styles.heroLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={styles.heroEyebrow}>SAKSHAM FLEET COMMAND</span>
            <PageGuideTrigger />
          </div>
          <h1 className={styles.heroTitle}>{t('dispatch.title')}</h1>
          <p className={styles.heroLead}>
            {t('dispatch.subtitle')}
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDotPulse} />
            <span className={styles.statusLabel}>SYSTEM LIVE</span>
          </div>
          <span className={styles.statusDetails}>
            {summaryStats.active} Active Dispatches
          </span>
        </div>
      </header>

      {/* ── KPI Strip Section ── */}
      <section ref={summaryRef} className={styles.summarySection}>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryTile}>
            <span className={styles.summaryLabel}>ACTIVE DISPATCHES</span>
            <span className={styles.summaryNum}>{String(summaryStats.active).padStart(2, '0')}</span>
            <span className={styles.summarySupport}>
              {summaryStats.active > 0 ? `● ${summaryStats.active} currently moving` : 'No active dispatches'}
            </span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryLabel}>PENDING DISPATCH</span>
            <span className={styles.summaryNum}>{String(summaryStats.awaiting).padStart(2, '0')}</span>
            <span className={styles.summarySupport}>
              {summaryStats.awaiting > 0 ? `● Awaiting fleet codes` : 'All requests dispatched'}
            </span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryLabel}>EN ROUTE</span>
            <span className={styles.summaryNum}>{String(summaryStats.enroute).padStart(2, '0')}</span>
            <span className={styles.summarySupport}>
              {summaryStats.enroute > 0 ? `● In transit telemetry` : 'No vehicles en route'}
            </span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryLabel}>ARRIVED TARGETS</span>
            <span className={styles.summaryNum}>{String(summaryStats.arriving).padStart(2, '0')}</span>
            <span className={styles.summarySupport}>
              {summaryStats.arriving > 0 ? `● Handover verification` : 'No arrivals pending'}
            </span>
          </div>
          <div className={styles.summaryTile}>
            <span className={styles.summaryLabel}>FLEET READINESS</span>
            <span className={styles.summaryNum}>
              {Math.round(((vehicles.filter(v => v.status === 'AVAILABLE').length) / (vehicles.length || 1)) * 100)}%
            </span>
            <span className={styles.summarySupport}>
              {vehicles.filter(v => v.status === 'AVAILABLE').length} of {vehicles.length} standby
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Workspace ── */}
      <div ref={workspaceRef} className={styles.workspace}>
        
        {/* Left Column: Map & Telemetry Details */}
        <div className={styles.leftCol}>
          <div className={styles.mapHeader}>
            <div className={styles.mapTitleBlock}>
              <span className={styles.mapTitle}>Live Operational Map</span>
              <span className={styles.mapSubtitle}>Real-time tactical fleet positioning</span>
            </div>
            <div className={styles.mapSyncBlock}>
              <span className={styles.mapPulse} />
              <span className={styles.mapSyncLabel}>TELEMETRY ACTIVE</span>
            </div>
          </div>
          
          <div className={styles.mapContainer}>
            {/* Map Toolbar Overlay */}
            <div className={styles.mapToolbar}>
              <button 
                className={`${styles.toolbarBtn} ${showVehicles ? styles.toolbarBtnActive : ''}`}
                onClick={() => setShowVehicles(prev => !prev)}
              >
                Fleet Layer
              </button>
              <button 
                className={`${styles.toolbarBtn} ${showIncidents ? styles.toolbarBtnActive : ''}`}
                onClick={() => setShowIncidents(prev => !prev)}
              >
                Incidents
              </button>
            </div>

            {/* Map Legend Overlay */}
            <div className={styles.mapLegend}>
              <span className={styles.legendTitle}>FLEET CODES</span>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotAvailable}`} />
                <span>Available</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotAssigned}`} />
                <span>Assigned</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotEnRoute}`} />
                <span>En Route</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotArrived}`} />
                <span>Arrived</span>
              </div>
            </div>

            <MapView
              incidents={mapIncidents}
              resources={[]}
              vehicles={mapVehicles}
              shelters={[]}
              layerFilters={{
                incidents: showIncidents,
                resources: false,
                vehicles: showVehicles,
                shelters: false,
                routes: true
              }}
            />
          </div>

          {/* Real Telemetry strip near Map */}
          <div className={styles.telemetryStrip}>
            <div className={styles.telemetryMetric}>
              <span className={styles.telemetryPulse} />
              <span>SIGNAL STATUS: </span>
              <span>NOMINAL / SECURE</span>
            </div>
            <div className={styles.telemetryMetric}>
              <span>ACTIVE VEHICLES ONLINE: </span>
              <span>{vehicles.length} Units</span>
            </div>
            <div className={styles.telemetryMetric}>
              <span>LAST TELEMETRY REFRESH: </span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          
          {/* Action Control Panel */}
          {activeMission ? (
            <div className={styles.actionWorkspace}>
              <div className={styles.actionHeader}>
                <span className={styles.actionEyebrow}>MISSION INTERACTIVE CONTROL</span>
                <span className={styles.actionStatusLabel}>Current State: <strong>{activeMission.status.replace(/_/g, ' ')}</strong></span>
              </div>
              <div className={styles.actionButtons}>
                {activeMission.status === 'DISPATCHED' && (
                  <button className={styles.primaryActionBtn} onClick={handleUpdateStatus}>
                    Depart Logistics Fleet <ArrowRight size={13} />
                  </button>
                )}
                {activeMission.status === 'EN_ROUTE' && (
                  <button className={styles.primaryActionBtn} onClick={handleUpdateStatus}>
                    Confirm Arrival at Drop Point <ArrowRight size={13} />
                  </button>
                )}
                {activeMission.status === 'ARRIVED' && (
                  <button className={styles.primaryActionBtn} onClick={handleUpdateStatus}>
                    Verify Handover Deliveries <CheckCircle size={13} />
                  </button>
                )}
                {activeMission.status === 'DELIVERED' && (
                  <div className={styles.completedBanner}>
                    <Check size={14} /> Mission Completed & Verified
                  </div>
                )}
                
                {activeMission.status !== 'DELIVERED' && activeMission.trafficLevel === 'BLOCKED' && (
                  <button className={styles.alertActionBtn} onClick={handleReroute}>
                    Re-route Fleet Unit <Compass size={13} />
                  </button>
                )}

                <button className={styles.secondaryActionBtn} onClick={() => setShowCreatePanel(true)}>
                  + NEW DISPATCH
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyTitle}>FLEET STANDBY</span>
              <p className={styles.emptyText}>No active routes currently require visualization. Fleet telemetry remains online.</p>
              <Link to="/operations/vehicles" className={styles.emptyActionBtn} style={{ marginTop: '8.5px', display: 'inline-block' }}>
                VIEW FLEET
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Dispatch Panel & Lists */}
        <div className={styles.rightCol}>
          
          {/* Dispatch operations box */}
          <div className={styles.opsPanel}>
            <div className={styles.opsHeader}>
              <span className={styles.opsTitle}>DISPATCH OPERATIONS</span>
              <button className={styles.createBtn} onClick={() => setShowCreatePanel(true)}>
                + CREATE DISPATCH
              </button>
            </div>

            {/* Operational Attention Section */}
            <div className={styles.attentionSection}>
              {activeMission && activeMission.alertMessage ? (
                <div className={styles.attentionAlert}>
                  <AlertOctagon size={14} style={{ marginRight: 8, flexShrink: 0 }} />
                  <span>{activeMission.alertMessage}</span>
                </div>
              ) : (
                <div className={styles.attentionNormal}>
                  <span>✓</span> Fleet operations normal. No exceptions detected.
                </div>
              )}
            </div>

            <div className={styles.listSection}>
              <span className={styles.sectionLabel}>Active Missions</span>
              <div className={styles.missionList}>
                {missions.map(m => {
                  const isActive = m.id === selectedMissionId;
                  return (
                    <button
                      key={m.id}
                      className={`${styles.missionRow} ${isActive ? styles.missionRowActive : ''}`}
                      onClick={() => setSelectedMissionId(m.id)}
                    >
                      <div className={styles.mrHeader}>
                        <span className={styles.mrId}>{m.id}</span>
                        <span className={`${styles.mrStatusBadge} ${styles['status_' + m.status]}`}>
                          {m.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className={styles.mrBody}>
                        <span><strong>Cargo:</strong> {m.quantity.toLocaleString()} {m.unit} {m.resourceType}</span>
                        <span><strong>Target:</strong> {m.destinationName.split(',')[0]}</span>
                      </div>
                      <div className={styles.mrFooter}>
                        <span>Vehicle: {m.vehicleId}</span>
                        <span className={styles.mrEta}>
                          {m.etaMinutes > 0 ? `ETA ${m.etaMinutes}m` : 'ARRIVED'}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {missions.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyTitle}>NO ACTIVE DISPATCHES</span>
                    <span className={styles.emptyText}>There are currently no vehicles in transit. Use the button to authorize a mission.</span>
                    <button className={styles.emptyActionBtn} onClick={() => setShowCreatePanel(true)}>
                      CREATE DISPATCH
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Mission telemetry & progress timeline */}
          {activeMission && (
            <div ref={detailRef} className={styles.detailPanel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>MISSION DETAILS</span>
                <span className={styles.panelId}>{activeMission.id}</span>
              </div>

              <div className={styles.detailGrid}>
                <div>
                  <span className={styles.detailLabel}>RESOURCE TYPE</span>
                  <span className={styles.detailVal}>{activeMission.resourceType}</span>
                </div>
                <div>
                  <span className={styles.detailLabel}>QUANTITY</span>
                  <span className={styles.detailVal}>{activeMission.quantity.toLocaleString()} {activeMission.unit}</span>
                </div>
                <div>
                  <span className={styles.detailLabel}>VEHICLE UNIT</span>
                  <span className={styles.detailVal}>{activeMission.vehicleId}</span>
                </div>
                <div>
                  <span className={styles.detailLabel}>OPERATOR</span>
                  <span className={styles.detailVal}>{activeMission.operatorName}</span>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className={styles.timelineSection}>
                <span className={styles.panelEyebrow}>DISPATCH PIPELINE</span>
                <div className={styles.timeline}>
                  {activeMission.timeline.map((step, idx) => (
                    <div key={idx} className={`${styles.timelineStep} ${step.done ? styles.stepDone : ''}`}>
                      <div className={styles.stepCircle}>
                        {step.done && <Check size={8} style={{ color: '#FAF8F3' }} />}
                      </div>
                      <div className={styles.stepContent}>
                        <span className={styles.stepTitle}>{step.title}</span>
                        <span className={styles.stepTime}>{step.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Route Path stop summary */}
              <div className={styles.routeSection}>
                <span className={styles.panelEyebrow}>APPROVED ROUTE</span>
                <div className={styles.routePath}>
                  {activeMission.routePath.map((stop, idx) => (
                    <div key={idx} className={styles.routeStop}>
                      {idx > 0 && <span className={styles.routeArrow}>↓</span>}
                      <DynamicText text={stop} className={styles.routeStopName} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fleet readiness counts */}
          <div className={styles.readinessPanel}>
            <span className={styles.panelEyebrow}>Fleet Readiness Index</span>
            <div className={styles.readinessGrid}>
              <div className={styles.readinessRow}>
                <div className={styles.readinessInfo}>
                  <span>AVAILABLE STANDBY</span>
                  <span>{readinessCounts.available} Units</span>
                </div>
                <div className={styles.readinessBar}>
                  <div className={`${styles.readinessFill} ${styles.fillAvailable}`} style={{ width: `${readinessCounts.availablePct}%` }} />
                </div>
              </div>
              <div className={styles.readinessRow}>
                <div className={styles.readinessInfo}>
                  <span>ACTIVE / IN TRANSIT</span>
                  <span>{readinessCounts.enroute} Units</span>
                </div>
                <div className={styles.readinessBar}>
                  <div className={`${styles.readinessFill} ${styles.fillEnRoute}`} style={{ width: `${readinessCounts.enroutePct}%` }} />
                </div>
              </div>
              <div className={styles.readinessRow}>
                <div className={styles.readinessInfo}>
                  <span>MAINTENANCE / DEPOT</span>
                  <span>{readinessCounts.maintenance} Units</span>
                </div>
                <div className={styles.readinessBar}>
                  <div className={`${styles.readinessFill} ${styles.fillMaintenance}`} style={{ width: `${readinessCounts.maintenancePct}%` }} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Create Dispatch Modal Drawer ── */}
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
                <label className={styles.formLabel}>MISSION DETAILS — SELECT ALLOCATION</label>
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
                  {allocationsAwaitingDispatch.length === 0 && (
                    <option value="" disabled>No approved allocations awaiting dispatch</option>
                  )}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>FLEET ASSIGNMENT — SELECT VEHICLE</label>
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
                <label className={styles.formLabel}>ASSIGNED OPERATOR</label>
                <input
                  type="text"
                  value={formOperator}
                  onChange={e => setFormOperator(e.target.value)}
                  required
                />
              </div>

              {/* Summarized dynamic review panel */}
              {selectedAllocationObj && selectedVehicleObj && (
                <div className={styles.stockVerification}>
                  <div className={styles.verificationRow}>
                    <span>✓ PRE-DISPATCH VALIDATION OK</span>
                    <span className={styles.verificationOk}>READY</span>
                  </div>
                  <div className={styles.verificationPreview}>
                    <p style={{ margin: '0 0 6px' }}><strong>DISPATCH SUMMARY PREVIEW</strong></p>
                    <p style={{ margin: '0 0 4px' }}><strong>Resource:</strong> {selectedAllocationObj.quantity.toLocaleString()} {selectedAllocationObj.unit} {selectedAllocationObj.itemNeeded}</p>
                    <p style={{ margin: '0 0 4px' }}><strong>Destination:</strong> {selectedAllocationObj.zoneName}</p>
                    <p style={{ margin: '0 0 4px' }}><strong>Vehicle:</strong> {selectedVehicleObj.name} ({selectedVehicleObj.id})</p>
                    <p style={{ margin: '0' }}><strong>Driver/Operator:</strong> {formOperator}</p>
                  </div>
                </div>
              )}

              <div className={styles.cpActions}>
                <button type="button" className={styles.cpCancelBtn} onClick={() => setShowCreatePanel(false)}>
                  CANCEL
                </button>
                <button type="submit" className={styles.cpSubmitBtn} disabled={isSubmitting}>
                  {isSubmitting ? 'DISPATCHING...' : 'AUTHORIZE DISPATCH →'}
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
                <p style={{ margin: '0 0 4px' }}><strong>Destination:</strong> {h.dest}</p>
                <p style={{ margin: '0 0 4px' }}><strong>Cargo payload:</strong> {h.resource}</p>
                <span className={styles.hcTimestamp}>Delivered at {h.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>



      <PageGuidebook guideKey="dispatch" />
    </div>
  );
};

export default Dispatch;
