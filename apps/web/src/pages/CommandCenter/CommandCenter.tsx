import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MapView } from '../../components/map/MapView';
import { useOperationalState } from '../../context/OperationalStateContext';
import {
  Layers,
  ChevronRight,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import styles from './CommandCenter.module.css';

import GradientBackground from '../../components/ui/noisy-gradient-backgrounds';

gsap.registerPlugin(ScrollTrigger);

const incidentTypeLabel: Record<string, string> = {
  FLOOD: 'Flood',
  FIRE: 'Fire',
  EARTHQUAKE: 'Earthquake',
  MEDICAL_EMERGENCY: 'Medical Emergency',
  STRUCTURAL_COLLAPSE: 'Structural Collapse',
  RESOURCE_SHORTAGE: 'Resource Shortage',
};

const fmtTimeAgo = (iso: string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
};

// ─── Smooth CountUp Hook ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1500, triggerStart = false) {
  const [value, setValue] = useState(0);
  const useRefTarget = useRef(target);
  useRefTarget.current = target;

  useEffect(() => {
    if (!triggerStart) return;
    let frame = 0;
    const totalFrames = Math.ceil(duration / 16);
    const timer = setInterval(() => {
      frame++;
      const progress = gsap.parseEase('power2.out')(frame / totalFrames);
      setValue(Math.round(useRefTarget.current * progress));
      if (frame >= totalFrames) {
        setValue(useRefTarget.current);
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, triggerStart]);

  return value;
}

export const CommandCenter: React.FC = () => {
  const { incidents, vehicles, resources, shelters, requests } = useOperationalState();

  const [layerFilters, setLayerFilters] = useState({
    incidents: true, resources: true, vehicles: true, shelters: true, routes: true,
  });
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const layersRef = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'incident' | 'vehicle' | 'shelter'; obj: any } | null>(null);

  // Animation triggers state
  const [statsAnimated, setStatsAnimated] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);

  // Close layers popover on outside click
  useEffect(() => {
    if (!isLayersOpen) return;
    const handler = (e: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(e.target as Node)) {
        setIsLayersOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isLayersOpen]);

  // Computed KPIs
  const kpiStats = useMemo(() => {
    const active = incidents.filter(i => i.status !== 'RESOLVED').length;
    const pending = requests.filter(r => r.status === 'PENDING').length;
    const availRes = resources.filter(r => r.status === 'AVAILABLE').length;
    const onMission = vehicles.filter(v => v.status === 'EN_ROUTE' || v.status === 'DISPATCHED' || v.status === 'ARRIVED').length;

    const totalCap = shelters.reduce((a, s) => a + s.capacityTotal, 0);
    const occupied = shelters.reduce((a, s) => a + s.capacityOccupied, 0);
    const shelterPct = totalCap > 0 ? Math.round((occupied / totalCap) * 100) : 0;

    return { active, pending, availRes, onMission, shelterPct };
  }, [incidents, requests, resources, vehicles, shelters]);

  // Get top 3 urgent active incidents
  const topIncidents = useMemo(() => {
    return incidents
      .filter(i => i.status !== 'RESOLVED')
      .slice(0, 3);
  }, [incidents]);

  // CountUp states connected to ScrollTrigger hook
  const activeCountVal = useCountUp(kpiStats.active, 1600, statsAnimated);
  const pendingCountVal = useCountUp(kpiStats.pending, 1600, statsAnimated);
  const availResCountVal = useCountUp(kpiStats.availRes, 1600, statsAnimated);
  const onMissionCountVal = useCountUp(kpiStats.onMission, 1600, statsAnimated);
  const shelterPctCountVal = useCountUp(kpiStats.shelterPct, 1600, statsAnimated);

  // ─── GSAP ScrollTrigger & Entrance animations ──────────────────────────────
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setStatsAnimated(true);
      return;
    }

    const ctx = gsap.context(() => {
      // 1. Hero text clip-path / reveal entrance animation
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl.fromTo(`.${styles.heroSubtitle}`,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6 }
      )
        .fromTo(`.${styles.heroTitle}`,
          { clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)', y: 40 },
          { clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0% 100%)', y: 0, duration: 0.95 },
          '-=0.45'
        )
        .fromTo(`.${styles.heroLead}`,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        )
        .fromTo(`.${styles.heroStatus}`,
          { opacity: 0, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 0.5 },
          '-=0.5'
        );

      // 2. Stats Section ScrollTrigger reveal & start counts
      gsap.fromTo(`.${styles.statCell}`,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 88%',
            onEnter: () => setStatsAnimated(true),
          }
        }
      );

      // 3. Map Section Reveal
      gsap.fromTo(`.${styles.mapWrapper}`,
        { clipPath: 'inset(10% 0% 10% 0% round 8px)', opacity: 0, scale: 0.96 },
        {
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
          opacity: 1,
          scale: 1,
          duration: 1.1,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: mapRef.current,
            start: 'top 85%',
          }
        }
      );

      // 4. Details Grid Reveal
      gsap.fromTo(`.${styles.gridCol}`,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: detailsRef.current,
            start: 'top 85%',
          }
        }
      );

      // 5. Stagger incident rows
      gsap.fromTo(`.${styles.incidentRow}`,
        { opacity: 0, x: -16 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: `.${styles.incidentList}`,
            start: 'top 90%',
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      <GradientBackground />
      {/* 1. EDITORIAL HERO SECTION */}
      <section ref={heroRef} className={styles.heroSection}>
        <div className={styles.heroHeader}>
          <div className={styles.heroTitles}>
            <span className={styles.heroSubtitle}>SITUATION ROOM</span>
            <div style={{ overflow: 'hidden' }}>
              <h1 className={styles.heroTitle}>Live Operational Overview</h1>
            </div>
            <p className={styles.heroLead}>
              A unified monitoring layout connecting emergency incidents, resource supply coordinates,
              rescue fleet routing, and shelter capacities across the region.
            </p>
          </div>
          <div className={styles.heroStatus}>
            <span className={styles.statusDotPulse} />
            <div className={styles.statusDetails}>
              <span className={styles.statusLabel}>SYSTEM OPERATIONAL</span>
              <span className={styles.syncLabel}>LAST SYNC: JUST NOW</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS OVERVIEW SECTION */}
      <section ref={statsRef} className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statCell}>
            <span className={styles.statNumber}>{String(activeCountVal).padStart(2, '0')}</span>
            <span className={styles.statLabel}>Active Incidents</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNumber}>{String(pendingCountVal).padStart(2, '0')}</span>
            <span className={styles.statLabel}>Pending Demands</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNumber}>{String(availResCountVal).padStart(2, '0')}</span>
            <span className={styles.statLabel}>Active Depots</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNumber}>{String(onMissionCountVal).padStart(2, '0')}</span>
            <span className={styles.statLabel}>Vehicles On Mission</span>
          </div>
          <div className={styles.statCell}>
            <span className={styles.statNumber}>{shelterPctCountVal}%</span>
            <span className={styles.statLabel}>Shelter Capacity</span>
          </div>
        </div>
      </section>

      {/* 3. LIVE MAP SECTION */}
      <section ref={mapRef} className={styles.mapSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>LIVE SITUATIONAL AWARENESS</h2>
            <p className={styles.sectionSubtitle}>Delhi NCR Regional Operations Grid</p>
          </div>

          {/* Layer controls */}
          <div className={styles.layerControlWrapper} ref={layersRef}>
            <button
              className={styles.layerToggleBtn}
              onClick={() => setIsLayersOpen(!isLayersOpen)}
            >
              <Layers size={13} />
              <span>Map Layers</span>
            </button>

            {isLayersOpen && (
              <div className={styles.layerDropdown}>
                <div className={styles.dropdownSection}>
                  <span className={styles.dropdownLabel}>VISIBLE LAYERS</span>
                  {(Object.entries(layerFilters) as [keyof typeof layerFilters, boolean][]).map(([key, on]) => (
                    <label key={key} className={styles.layerCheckboxRow}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setLayerFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                      />
                      <span className={`${styles.checkboxLabel} ${on ? styles.checkboxOn : ''}`}>{key}</span>
                    </label>
                  ))}
                </div>
                <div className={styles.dropdownDivider} />
                <div className={styles.dropdownSection}>
                  <span className={styles.dropdownLabel}>LEGEND</span>
                  <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.ldCritical}`} />Critical Threats</div>
                  <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.ldHigh}`} />High Severity</div>
                  <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.ldMedium}`} />Medium Priority</div>
                  <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.ldShelter}`} />Active Shelters</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Workspace */}
        <div className={styles.mapWrapper}>
          <MapView
            incidents={incidents}
            resources={resources}
            vehicles={vehicles}
            shelters={shelters}
            selectedIncident={selectedItem?.type === 'incident' ? selectedItem.obj : null}
            selectedVehicle={selectedItem?.type === 'vehicle' ? selectedItem.obj : null}
            onSelectIncident={(i) => setSelectedItem({ type: 'incident', obj: i })}
            onSelectVehicle={(v) => setSelectedItem({ type: 'vehicle', obj: v })}
            onSelectShelter={(s) => setSelectedItem({ type: 'shelter', obj: s })}
            layerFilters={layerFilters}
          />
        </div>
      </section>

      {/* 4. CURRENT WORKFLOW / DETAIL GRID SECTION */}
      <section ref={detailsRef} className={styles.detailsGridSection}>
        <div className={styles.gridCols}>

          {/* Priority Incidents Feed Column */}
          <div className={styles.gridCol}>
            <div className={styles.gridColHeader}>
              <h3>Priority Operational Focus</h3>
              <Link to="/operations/incidents" className={styles.viewRegistryLink}>
                View Incident Registry <ArrowRight size={12} />
              </Link>
            </div>

            <div className={styles.incidentList}>
              {topIncidents.map((incident) => (
                <button
                  key={incident.id}
                  className={`${styles.incidentRow} ${selectedItem?.obj?.id === incident.id ? styles.incidentRowActive : ''}`}
                  onClick={() => setSelectedItem({ type: 'incident', obj: incident })}
                >
                  <div className={`${styles.sevBar} ${styles['sev_' + incident.severity]}`} />
                  <div className={styles.incContent}>
                    <div className={styles.incHeaderRow}>
                      <span className={styles.incId}>{incident.id}</span>
                      <span className={`${styles.sevBadge} ${styles['badge_' + incident.severity]}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <div className={styles.incType}>{incidentTypeLabel[incident.type] || incident.type}</div>
                    <div className={styles.incLocation}><MapPin size={10} /> {incident.location}</div>
                  </div>
                  <ChevronRight size={14} className={styles.rowArrow} />
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Inspection Column */}
          <div className={styles.gridCol}>
            <div className={styles.gridColHeader}>
              <h3>Inspector Context Panel</h3>
              {selectedItem && (
                <button className={styles.clearPanelBtn} onClick={() => setSelectedItem(null)}>
                  Clear selection
                </button>
              )}
            </div>

            <div className={styles.inspectorContainer}>
              {selectedItem ? (
                <div className={styles.inspectorBody}>
                  {selectedItem.type === 'incident' && (
                    <div className={styles.inspectorDetails}>
                      <span className={styles.inspectorSubtitle}>INCIDENT DETAILS</span>
                      <h4 className={styles.inspectorTitle}>{incidentTypeLabel[selectedItem.obj.type] || selectedItem.obj.type}</h4>
                      <p className={styles.inspectorLoc}><MapPin size={11} /> {selectedItem.obj.location}</p>

                      <div className={styles.metaRow}>
                        <span className={styles.metaBadge}>STATUS: {selectedItem.obj.status}</span>
                        <span className={styles.metaBadge}>REPORTED: {fmtTimeAgo(selectedItem.obj.time)}</span>
                      </div>

                      <div className={styles.statsSnippet}>
                        <div>
                          <span className={styles.snippetLabel}>Affected Count</span>
                          <span className={styles.snippetValue}>{selectedItem.obj.casualtiesCount || 0} casualties</span>
                        </div>
                        <div>
                          <span className={styles.snippetLabel}>Displaced Count</span>
                          <span className={styles.snippetValue}>{selectedItem.obj.displacedCount || 0} evacuees</span>
                        </div>
                      </div>

                      <p className={styles.inspectorDesc}>{selectedItem.obj.description}</p>

                      <Link to={`/operations/incidents/${selectedItem.obj.id}/response`} className={styles.inspectCta}>
                        Action Dispatch Workspace &rarr;
                      </Link>
                    </div>
                  )}

                  {selectedItem.type === 'vehicle' && (
                    <div className={styles.inspectorDetails}>
                      <span className={styles.inspectorSubtitle}>VEHICLE DETAILS</span>
                      <h4 className={styles.inspectorTitle}>{selectedItem.obj.name}</h4>
                      <p className={styles.inspectorLoc}><CheckCircle size={11} /> Status: {selectedItem.obj.status}</p>
                      <div className={styles.metaRow}>
                        <span className={styles.metaBadge}>DRIVE: {selectedItem.obj.driverName}</span>
                        <span className={styles.metaBadge}>CAP: {selectedItem.obj.capacity}</span>
                      </div>
                      {selectedItem.obj.cargo && (
                        <div className={styles.cargoInfo}>
                          <strong>Cargo:</strong> {selectedItem.obj.cargo}
                        </div>
                      )}
                      <Link to="/operations/vehicles" className={styles.inspectCta}>
                        Inspect Fleet &rarr;
                      </Link>
                    </div>
                  )}

                  {selectedItem.type === 'shelter' && (
                    <div className={styles.inspectorDetails}>
                      <span className={styles.inspectorSubtitle}>SHELTER DETAILS</span>
                      <h4 className={styles.inspectorTitle}>{selectedItem.obj.name}</h4>
                      <p className={styles.inspectorLoc}><MapPin size={11} /> {selectedItem.obj.locationName}</p>
                      <div className={styles.metaRow}>
                        <span className={styles.metaBadge}>CAP: {selectedItem.obj.capacityOccupied}/{selectedItem.obj.capacityTotal} occupied</span>
                      </div>
                      <Link to="/operations/shelters" className={styles.inspectCta}>
                        Manage Shelter Occupancy &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.inspectorPlaceholder}>
                  <AlertTriangle size={24} className={styles.phIcon} />
                  <p>No operational object selected</p>
                  <span>Select a map marker or registry item to view status coordinates and dispatch routes.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default CommandCenter;
