import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOperationalState } from '../../context/OperationalStateContext';
import { MapView } from '../../components/map/MapView';
import styles from './IncidentResponse.module.css';

interface TimelineStep {
  time: string;
  title: string;
  description: string;
}

export const IncidentResponse: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const {
    incidents,
    vehicles,
    requests,
    shelters,
    resources,
    updateIncidentStatus,
    dispatchVehicleToIncident
  } = useOperationalState();

  const [mounted, setMounted] = useState(false);
  const [selectedRecs, setSelectedRecs] = useState<Record<string, boolean>>({
    deploy: true,
    allocate: true,
    notify: true,
    monitor: true,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [mapInfoOverlay, setMapInfoOverlay] = useState<{
    type: 'vehicle' | 'shelter' | 'resource';
    name: string;
    details: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const incident = incidents.find(i => i.id === incidentId);

  if (!incident) {
    return (
      <div className={styles.notFoundContainer}>
        <h3>Incident Not Found</h3>
        <p>The requested incident reference ID could not be located in the active registries.</p>
        <Link to="/operations/incidents" className={styles.backBtn}>Return to Incidents Registry</Link>
      </div>
    );
  }

  // Related requests (Demand matching)
  const relatedRequest = requests.find(r => r.incidentId === incident.id) || 
    requests.find(r => r.zoneName.includes(incident.location) || incident.location.includes(r.zoneName));

  // Determine nearest resource depot
  const nearestDepot = resources.find(res => res.status === 'AVAILABLE') || resources[0];

  // Determine nearest shelter
  const nearestShelter = shelters.find(s => s.status === 'OPEN') || shelters[0];

  // Determine recommended vehicle unit
  const recommendedVehicle = vehicles.find(v => v.status === 'AVAILABLE') || vehicles[0];

  const handleRecToggle = (key: string) => {
    setSelectedRecs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDispatchClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmDispatch = () => {
    if (recommendedVehicle) {
      dispatchVehicleToIncident(recommendedVehicle.id, incident.id);
    } else {
      updateIncidentStatus(incident.id, 'DISPATCHED');
    }
    setShowConfirmModal(false);
  };

  // Safe UI colors
  const severityColors: Record<string, string> = {
    CRITICAL: '#DC2626',
    HIGH: '#E86F16',
    MEDIUM: '#EAB308',
    LOW: '#059669'
  };

  const formatDelhiTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
  };

  // Combine default timeline items and append live state change feedback
  const timelineEvents: TimelineStep[] = [];
  if (incident.timeline && incident.timeline.length > 0) {
    incident.timeline.forEach(t => {
      timelineEvents.push({
        time: t.time,
        title: t.title,
        description: t.description
      });
    });
  } else {
    // Fallback default timeline
    timelineEvents.push(
      { time: '05:45', title: 'Incident reported', description: 'Yamuna Bank flood event registered by regional duty office.' },
      { time: '05:49', title: 'Incident verified', description: 'Control room validation with satellite coordinates completed.' },
      { time: '05:52', title: 'Resource requirement generated', description: 'Logistics engine requested 12,000 L drinking water.' },
      { time: '05:55', title: 'Nearest vehicle identified', description: `${recommendedVehicle?.id || 'VEH-BT-401'} allocated to queue.` }
    );
  }

  // Live timeline updates following dispatch status
  if (incident.status === 'DISPATCHED') {
    timelineEvents.push({
      time: '06:02',
      title: `${recommendedVehicle?.id || 'VEH-BT-401'} Dispatched`,
      description: 'Vehicle left depot carrying critical supply payloads.'
    });
    timelineEvents.push({
      time: '06:16',
      title: 'Estimated arrival',
      description: 'Route navigation indicates ~14 mins travel time remaining.'
    });
  } else {
    timelineEvents.push({
      time: '06:01',
      title: 'Response awaiting dispatch',
      description: 'Duty coordinator review required to deploy personnel.'
    });
  }

  return (
    <div className={`${styles.container} ${mounted ? styles.mounted : ''}`}>
      {/* ── 1. Page Header ── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.eyebrow}>INCIDENT RESPONSE</span>
          <h1 className={styles.title}>Operational Response Workspace</h1>
          <p className={styles.lead}>
            Review the situation, coordinate available resources, and authorize the appropriate response.
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.liveStatus}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>LIVE OPERATIONAL STATUS</span>
          </div>
          <div className={styles.systemStatus}>
            <span className={styles.statusNum}>● SYSTEM OPERATIONAL</span>
            <span className={styles.statusLabel}>Last sync: JUST NOW</span>
          </div>
        </div>
      </header>

      {/* ── 2. Situation Header ── */}
      <section className={styles.situationHeader}>
        <div className={styles.sitInfo}>
          <span className={styles.sitId} style={{ color: severityColors[incident.severity] || '#0B2119' }}>
            {incident.id} · {incident.severity} INCIDENT
          </span>
          <h2 className={styles.sitName}>{incident.type.replace(/_/g, ' ')}</h2>
          <p className={styles.sitLoc}>📍 {incident.location}</p>
        </div>
        <div className={styles.sitMetaGrid}>
          <div className={styles.sitMetaCell}>
            <span className={styles.metaLabel}>REPORTED</span>
            <span className={styles.metaVal}>{incident.reportedAt ? formatDelhiTime(incident.reportedAt) : formatDelhiTime(incident.time)}</span>
          </div>
          <div className={styles.sitMetaCell}>
            <span className={styles.metaLabel}>AFFECTED</span>
            <span className={styles.metaVal}>~{incident.peopleAffected || incident.displacedCount || '1,200'} people</span>
          </div>
          <div className={styles.sitMetaCell}>
            <span className={styles.metaLabel}>INCIDENT TYPE</span>
            <span className={styles.metaVal}>{incident.type}</span>
          </div>
          <div className={styles.sitMetaCell}>
            <span className={styles.metaLabel}>RESPONSE STATE</span>
            <span className={styles.metaVal} style={{ fontWeight: 800 }}>
              {incident.status === 'DISPATCHED' ? 'UNITS ACTIVE' : 'AWAITING DISPATCH'}
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. Primary Response Workspace ── */}
      <div className={styles.workspace}>
        {/* Left Column: Situation Intelligence */}
        <div className={styles.intelligenceColumn}>
          <div className={styles.mapHeader}>
            <span className={styles.mapLabel}>GEOGRAPHIC CONTEXT MAP</span>
            <span className={styles.mapSub}>Showing nearby assets &amp; navigation routing</span>
          </div>
          <div className={styles.mapWrapper}>
            <MapView
              incidents={[incident]}
              resources={resources}
              vehicles={vehicles}
              shelters={shelters}
              selectedIncident={incident}
              layerFilters={{
                incidents: true,
                resources: true,
                vehicles: true,
                shelters: true,
                routes: true
              }}
              onSelectVehicle={(veh) => {
                setMapInfoOverlay({
                  type: 'vehicle',
                  name: veh.name,
                  details: `${veh.id} · Status: ${veh.status} · Contact: ${veh.driverContact}`
                });
              }}
              onSelectShelter={(shl) => {
                setMapInfoOverlay({
                  type: 'shelter',
                  name: shl.name,
                  details: `${shl.id} · Occupancy: ${shl.capacityOccupied}/${shl.capacityTotal} beds`
                });
              }}
            />
            {mapInfoOverlay && (
              <div className={styles.mapOverlay}>
                <div className={styles.overlayHeader}>
                  <span>MAP INSPECTOR</span>
                  <button onClick={() => setMapInfoOverlay(null)}>×</button>
                </div>
                <h4>{mapInfoOverlay.name}</h4>
                <p>{mapInfoOverlay.details}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recommended Response */}
        <div className={styles.recommendationColumn}>
          <span className={styles.columnEyebrow}>RECOMMENDED RESPONSE</span>
          <p className={styles.columnLead}>
            Based on incident severity, affected population, proximity, and current resource availability.
          </p>

          <div className={styles.recommendationStack}>
            {/* Rec 1: Deploy Vehicle */}
            <div 
              className={`${styles.recCard} ${selectedRecs.deploy ? styles.recCardActive : ''}`}
              onClick={() => handleRecToggle('deploy')}
            >
              <div className={styles.recNumber}>01</div>
              <div className={styles.recContent}>
                <span className={styles.recAction}>DEPLOY UNIT</span>
                <span className={styles.recTarget}>{recommendedVehicle ? recommendedVehicle.id : 'VEH-BT-401'}</span>
                <span className={styles.recDetails}>
                  {recommendedVehicle ? recommendedVehicle.name : 'NDRF Inflatable Rescue Boat A'} · 8.4 km away
                </span>
              </div>
              <div className={styles.checkbox} />
            </div>

            {/* Rec 2: Allocate resource */}
            <div 
              className={`${styles.recCard} ${selectedRecs.allocate ? styles.recCardActive : ''}`}
              onClick={() => handleRecToggle('allocate')}
            >
              <div className={styles.recNumber}>02</div>
              <div className={styles.recContent}>
                <span className={styles.recAction}>ALLOCATE MATERIAL</span>
                <span className={styles.recTarget}>
                  {relatedRequest ? `${relatedRequest.quantity.toLocaleString()} ${relatedRequest.unit} ${relatedRequest.itemNeeded}` : '12,000 L Clean Drinking Water'}
                </span>
                <span className={styles.recDetails}>Target allocation matches high priority civilian demands</span>
              </div>
              <div className={styles.checkbox} />
            </div>

            {/* Rec 3: Notify depot */}
            <div 
              className={`${styles.recCard} ${selectedRecs.notify ? styles.recCardActive : ''}`}
              onClick={() => handleRecToggle('notify')}
            >
              <div className={styles.recNumber}>03</div>
              <div className={styles.recContent}>
                <span className={styles.recAction}>NOTIFY DEPOT</span>
                <span className={styles.recTarget}>{nearestDepot ? nearestDepot.locationName.split(',')[0] : 'East Delhi Relief Depot'}</span>
                <span className={styles.recDetails}>Signal dispatch order for immediate mobilization</span>
              </div>
              <div className={styles.checkbox} />
            </div>

            {/* Rec 4: Monitor Shelter */}
            <div 
              className={`${styles.recCard} ${selectedRecs.monitor ? styles.recCardActive : ''}`}
              onClick={() => handleRecToggle('monitor')}
            >
              <div className={styles.recNumber}>04</div>
              <div className={styles.recContent}>
                <span className={styles.recAction}>MONITOR SHELTER</span>
                <span className={styles.recTarget}>{nearestShelter ? nearestShelter.name : 'Rohini Sector 15 Shelter'}</span>
                <span className={styles.recDetails}>
                  Current capacity at {nearestShelter ? Math.round((nearestShelter.capacityOccupied / nearestShelter.capacityTotal) * 100) : 84}%
                </span>
              </div>
              <div className={styles.checkbox} />
            </div>
          </div>

          {/* Response Actions */}
          <div className={styles.actionBar}>
            {incident.status !== 'DISPATCHED' ? (
              <button className={styles.dispatchBtn} onClick={handleDispatchClick}>
                DISPATCH RESPONSE →
              </button>
            ) : (
              <div className={styles.dispatchedStatusBanner}>
                ✓ DISPATCH COMPLETED
              </div>
            )}
            <button className={styles.reviewBtn}>REVIEW ALLOCATION</button>
            
            <div className={styles.minorActions}>
              <button onClick={() => updateIncidentStatus(incident.id, 'PRIORITIZED')}>ESCALATE</button>
              <button>HOLD</button>
              {incident.status !== 'RESOLVED' ? (
                <button onClick={() => updateIncidentStatus(incident.id, 'RESOLVED')}>MARK RESOLVED</button>
              ) : (
                <span className={styles.resolvedLabel}>RESOLVED</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Live Response Timeline ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>RESPONSE TIMELINE</h3>
        <div className={styles.timeline}>
          {timelineEvents.map((t, idx) => (
            <div key={idx} className={styles.timelineNode}>
              <div className={styles.timeWrapper}>
                <span className="tech-code font-bold">{t.time}</span>
              </div>
              <div className={styles.timelineConnector}>
                <div className={styles.timelineDot} />
                {idx < timelineEvents.length - 1 && <div className={styles.timelineLine} />}
              </div>
              <div className={styles.timelineBody}>
                <h4 className={styles.timelineTitle}>{t.title}</h4>
                <p className={styles.timelineText}>{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Related Operations ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>RELATED OPERATIONS</h3>
        <div className={styles.relatedGrid}>
          {/* Related Demand */}
          <div className={styles.relatedCard}>
            <span className={styles.relCardLabel}>RELATED DEMAND</span>
            <h4 className={styles.relCardTitle}>{relatedRequest ? relatedRequest.id : 'REQ-DEL-101'}</h4>
            <p className={styles.relCardDesc}>
              {relatedRequest ? `${relatedRequest.quantity.toLocaleString()} ${relatedRequest.unit} ${relatedRequest.itemNeeded}` : '12,000 L Clean Drinking Water'}
            </p>
            <div className={styles.relFooter}>
              <span className={styles.relStatus}>Status: {relatedRequest ? relatedRequest.status : 'Pending'}</span>
              <Link to="/operations/requests" className={styles.relLink}>View Demand →</Link>
            </div>
          </div>

          {/* Nearest Resources */}
          <div className={styles.relatedCard}>
            <span className={styles.relCardLabel}>NEAREST RESOURCES</span>
            <h4 className={styles.relCardTitle}>{nearestDepot ? nearestDepot.name : 'Clean Drinking Water'}</h4>
            <p className={styles.relCardDesc}>
              Located at {nearestDepot ? nearestDepot.locationName.split(',')[0] : 'East Delhi Relief Depot'} ({nearestDepot ? nearestDepot.quantity.toLocaleString() : '15,000'} {nearestDepot ? nearestDepot.unit : 'Liters'} available)
            </p>
            <div className={styles.relFooter}>
              <span className={styles.relStatus}>Status: Stock Available</span>
              <Link to="/operations/resources" className={styles.relLink}>View Inventory →</Link>
            </div>
          </div>

          {/* Nearest Shelter */}
          <div className={styles.relatedCard}>
            <span className={styles.relCardLabel}>NEAREST SHELTER</span>
            <h4 className={styles.relCardTitle}>{nearestShelter ? nearestShelter.name : 'Rohini Relief Camp'}</h4>
            <p className={styles.relCardDesc}>
              {nearestShelter ? nearestShelter.locationName : 'Sector 15, Rohini'} · {nearestShelter ? nearestShelter.capacityOccupied : '420'} / {nearestShelter ? nearestShelter.capacityTotal : '500'} beds filled
            </p>
            <div className={styles.relFooter}>
              <span className={styles.relStatus}>
                Occupancy: {nearestShelter ? Math.round((nearestShelter.capacityOccupied / nearestShelter.capacityTotal) * 100) : 84}%
              </span>
              <Link to="/operations/shelters" className={styles.relLink}>View Shelter →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Operational Activity Feed ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>RECENT ACTIVITY FEED</h3>
        <div className={styles.activityFeed}>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>21:32</span>
            <span className={styles.activityDesc}>Incident validity confirmed via local satellite coordinates.</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>21:34</span>
            <span className={styles.activityDesc}>Demand request token REQ-DEL-101 generated automatically.</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>21:36</span>
            <span className={styles.activityDesc}>Depot resource check initiated across East Delhi Sector.</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>21:38</span>
            <span className={styles.activityDesc}>Vehicle dispatch matching recommended for recommended unit.</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityTime}>21:41</span>
            <span className={styles.activityDesc}>Emergency Response Workspace recommendations generated.</span>
          </div>
        </div>
      </section>

      {/* ── 7. Smart Response Insight ── */}
      <section className={styles.insightSection}>
        <div className={styles.insightHeader}>
          <span>OPERATIONAL NOTE</span>
        </div>
        <p className={styles.insightText}>
          Water demand requirement can be safely fulfilled from East Delhi Relief Depot without affecting current critical regional allocations. Recommended dispatch route is clear of secondary debris risks.
        </p>
      </section>

      {/* ── Confirmation Modal ── */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>CONFIRM RESPONSE DISPATCH</h3>
            <div className={styles.modalGrid}>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>INCIDENT</span>
                <span>{incident.id} · {incident.type.replace(/_/g, ' ')}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>ASSIGNED UNIT</span>
                <span>{recommendedVehicle ? `${recommendedVehicle.id} (${recommendedVehicle.name})` : 'VEH-BT-401'}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>RESOURCE ALLOCATION</span>
                <span>{relatedRequest ? `${relatedRequest.quantity.toLocaleString()} ${relatedRequest.unit} ${relatedRequest.itemNeeded}` : '12,000 L drinking water'}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>DESTINATION</span>
                <span>{incident.location}</span>
              </div>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>ESTIMATED ARRIVAL</span>
                <span>14 minutes (ETA)</span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setShowConfirmModal(false)}>
                CANCEL
              </button>
              <button className={styles.modalConfirmBtn} onClick={handleConfirmDispatch}>
                CONFIRM DISPATCH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentResponse;
