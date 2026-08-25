import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useOperationalState } from '../../context/OperationalStateContext';
import { MapView } from '../../components/map/MapView';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';
import GradientBackground from '../../components/ui/noisy-gradient-backgrounds';
import { ArrowRight } from 'lucide-react';
import styles from './IncidentWorkspace.module.css';
import { ShaderBackground } from '../../components/ui/ShaderBackground';
import { IncidentAssessmentPanel } from './IncidentAssessmentPanel';
import apiClient from '../../services/apiClient';

export const IncidentWorkspace: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();
  const {
    incidents,
    vehicles,
    requests,
    shelters,
    resources,
    updateIncidentStatus,
    missions
  } = useOperationalState();

  const [newLogText, setNewLogText] = useState('');

  // --- Lifecycle action state ---
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // --- Assessment panel state ---
  const [showAssessmentPanel, setShowAssessmentPanel] = useState(false);
  const [assessmentRecord, setAssessmentRecord] = useState<any | null>(null);
  const [backendTimeline, setBackendTimeline] = useState<any[]>([]);

  // Find selected incident
  const incident = useMemo(() => {
    return incidents.find(i => i.id === incidentId) || null;
  }, [incidents, incidentId]);

  // Get the backend UUID for API calls
  const incidentUuid = incident ? ((incident as any).uuid || incident.id) : null;

  // Load assessment record and real timeline from backend
  const loadAssessmentData = useCallback(async () => {
    if (!incidentUuid) return;
    try {
      const [asmRes, tlRes] = await Promise.all([
        apiClient.getIncidentAssessments(incidentUuid),
        apiClient.getIncidentTimeline(incidentUuid),
      ]);
      if (Array.isArray(asmRes.data) && asmRes.data.length > 0) {
        setAssessmentRecord(asmRes.data[0]); // most recent assessment
      }
      if (Array.isArray(tlRes.data)) {
        setBackendTimeline(tlRes.data);
      }
    } catch {
      // Non-critical: fall back to local timeline
    }
  }, [incidentUuid]);

  useEffect(() => {
    loadAssessmentData();
  }, [loadAssessmentData]);

  // --- Awaited lifecycle action wrapper ---
  const handleLifecycleAction = async (targetStatus: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await updateIncidentStatus(incident!.id, targetStatus as any);
    } catch (err: any) {
      const msg = err?.message || 'Backend rejected this transition. Check officer credentials and incident state.';
      setActionError(`❌ ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };


  // GSAP animation refs
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!incident) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(heroRef.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6 })
        .fromTo(actionRef.current, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.5 }, '-=0.35')
        .fromTo(leftColRef.current?.children || [], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, '-=0.3')
        .fromTo(rightColRef.current?.children || [], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, '-=0.4');
    }, pageRef);

    return () => ctx.revert();
  }, [incident]);

  if (!incident) {
    return (
      <div className={styles.notFoundContainer}>
        <h3>Incident Record Not Found</h3>
        <p>The requested reference ID ({incidentId}) could not be located in the operational database.</p>
        <Link to="/operations/incidents" className={styles.backBtn}>Return to Registry</Link>
      </div>
    );
  }

  // Related requests (demands) connected to this incident
  const incidentRequests = useMemo(() => {
    const incUuid = (incident as any).uuid || incident.id;
    return requests.filter(r => r.incidentId === incUuid || r.incidentId === incident.id);
  }, [requests, incident.id, (incident as any).uuid]);

  // Active Dispatch missions associated with this incident
  const activeDispatches = useMemo(() => {
    const requestIds = incidentRequests.map(r => r.id);
    const incidentMissions = missions.filter(m => requestIds.includes(m.requestId) && m.status !== 'DELIVERED');
    return incidentMissions.map(m => {
      const veh = vehicles.find(v => v.id === m.vehicleId);
      return {
        id: m.id,
        status: m.status,
        name: veh?.name || 'Emergency Vehicle',
        driverName: veh?.driverName || 'Field Unit Operator',
        cargo: `${m.quantity.toLocaleString()} ${m.unit} of ${m.resourceType}`,
      };
    });
  }, [missions, incidentRequests, vehicles]);

  // Determine stage levels
  const stages = ['REPORTED', 'VERIFIED', 'PRIORITIZED', 'RESOURCE_MATCHED', 'DISPATCHED', 'UNDER_RESPONSE', 'RESOLVED'];
  const statusOrder: Record<string, number> = {
    REPORTED: 0,
    VERIFIED: 1,
    PRIORITIZED: 2,
    AWAITING_MATCH: 2,
    RESOURCE_MATCHED: 3,
    MATCHED: 3,
    DISPATCHED: 4,
    UNDER_RESPONSE: 5,
    RESOLVED: 6,
    ACTIVE: 2
  };
  const currentStageIndex = statusOrder[incident.status] ?? 0;

  // Custom Delhi zone shelters nearby
  const nearbyShelters = useMemo(() => {
    return shelters.slice(0, 2);
  }, [shelters]);

  // Check if all demands connected to the incident are fulfilled
  const incidentClosureCheck = useMemo(() => {
    const pendingCount = incidentRequests.filter(r => r.status !== 'FULFILLED' && r.status !== 'CANCELLED').length;
    return {
      ready: pendingCount === 0,
      activeCount: pendingCount
    };
  }, [incidentRequests]);

  // Primary action — maps incident status to next step.
  // REPORTED/NEEDS_INFORMATION → open AssessmentPanel (never one-click verify)
  // REJECTED → null (terminal, no further actions)
  // VERIFIED+ → standard operational flow
  const primaryAction = useMemo(() => {
    switch (incident.status) {
      case 'REPORTED':
        return {
          label: 'ASSESS INCIDENT',
          isAssessment: true,
          style: { background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }
        };
      case 'NEEDS_INFORMATION':
        return {
          label: 'RE-ASSESS INCIDENT',
          isAssessment: true,
          style: { background: 'linear-gradient(135deg, #92400E, #B45309)' }
        };
      case 'REJECTED':
        return null; // Terminal — no next action
      case 'VERIFIED':
        return {
          label: 'PRIORITIZE & ASSESS NEEDS',
          targetStatus: 'PRIORITIZED',
          style: {}
        };
      case 'PRIORITIZED':
        return {
          label: 'MATCH RESOURCES',
          targetStatus: null,
          navigate: () => {
            const req = incidentRequests[0] || requests.find(r => r.incidentId === incident.id);
            navigate(req ? `/operations/matching?requestId=${req.id}` : '/operations/matching');
          },
          style: { backgroundColor: '#E86F16' }
        };
      case 'RESOURCE_MATCHED':
        return {
          label: 'DISPATCH RESOURCE',
          targetStatus: null,
          navigate: () => {
            const req = incidentRequests[0] || requests.find(r => r.incidentId === incident.id);
            navigate(req ? `/operations/dispatch?allocationId=${req.id}` : '/operations/dispatch');
          },
          style: { backgroundColor: '#2563EB' }
        };
      case 'DISPATCHED':
        return {
          label: 'MARK UNDER RESPONSE',
          targetStatus: 'UNDER_RESPONSE',
          style: {}
        };
      case 'UNDER_RESPONSE':
        if (incidentClosureCheck.ready) {
          return {
            label: 'RESOLVE INCIDENT',
            targetStatus: 'RESOLVED',
            style: { backgroundColor: '#059669' }
          };
        } else {
          return {
            label: `RESOLVE INCIDENT (${incidentClosureCheck.activeCount} DEMANDS PENDING)`,
            targetStatus: null,
            navigate: () => setActionError(`⚠ Cannot resolve: ${incidentClosureCheck.activeCount} outstanding demand(s) must be fulfilled or cancelled first.`),
            style: { backgroundColor: '#4b5563', cursor: 'not-allowed', opacity: 0.6 }
          };
        }
      case 'RESOLVED':
      default:
        return null;
    }
  }, [incident.status, incidentRequests, requests, navigate, incident.id, incidentClosureCheck]);


  const severityColors: Record<string, string> = {
    CRITICAL: '#DC2626',
    HIGH: '#E86F16',
    MEDIUM: '#EAB308',
    LOW: '#059669'
  };

  // Add custom manual event log to incident timeline
  const handleAddTimelineLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) return;

    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
    });

    const newTimelineEntry = {
      time: timeStr,
      title: 'OPERATOR LOG ENTRY',
      description: newLogText
    };

    // Update state inside context (using setIncidents if context exports it)
    incident.timeline = [newTimelineEntry, ...(incident.timeline || [])];
    setNewLogText('');
  };


  return (
    <div ref={pageRef} className={styles.container}>
      <GradientBackground />

      {/* Assessment Panel overlay — shown when officer clicks ASSESS INCIDENT */}
      {showAssessmentPanel && incident && (
        <IncidentAssessmentPanel
          incident={incident}
          onClose={() => setShowAssessmentPanel(false)}
          onAssessmentComplete={(updatedInc: any) => {
            setShowAssessmentPanel(false);
            // Reload assessment + timeline data from backend
            setTimeout(() => loadAssessmentData(), 500);
            // Trigger status refresh in context
            if (updatedInc?.status) {
              updateIncidentStatus(incident.id, updatedInc.status as any).catch(() => {});
            }
          }}
        />
      )}

      <header ref={heroRef} className={`${styles.hero} shaderHeaderWrapper`}>
        <ShaderBackground className="absolute inset-0" />
        <div className={styles.heroLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span className={styles.heroEyebrow}>INCIDENT RESPONSE CASE WORKSPACE</span>
            <PageGuideTrigger />
          </div>
          <h1 className={styles.heroTitle}>{incident.id} · {incident.type.replace(/_/g, ' ')}</h1>
          <p className={styles.heroLead}>📍 {incident.location}</p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.badgeRow}>
            <span
              className={styles.severityBadge}
              style={{
                backgroundColor: `${severityColors[incident.severity]}15`,
                color: severityColors[incident.severity],
                border: `1px solid ${severityColors[incident.severity]}35`
              }}
            >
              {incident.severity} THREAT
            </span>
            <span
              className={styles.statusBadge}
              style={{
                backgroundColor: incident.status === 'REJECTED' ? 'rgba(239,68,68,0.15)' :
                  incident.status === 'NEEDS_INFORMATION' ? 'rgba(234,179,8,0.12)' : undefined,
                color: incident.status === 'REJECTED' ? '#FCA5A5' :
                  incident.status === 'NEEDS_INFORMATION' ? '#FBBF24' : undefined,
                borderColor: incident.status === 'REJECTED' ? 'rgba(239,68,68,0.3)' :
                  incident.status === 'NEEDS_INFORMATION' ? 'rgba(234,179,8,0.3)' : undefined,
              }}
            >
              {incident.status === 'REJECTED' && '✕ '}
              {incident.status === 'NEEDS_INFORMATION' && '⚠ '}
              {incident.status.replace(/_/g, ' ')}
            </span>
          </div>
          <span className={styles.timeInfo}>
            Reported: {new Date(incident.reportedAt || incident.time).toLocaleTimeString()} IST<br />
            Updated: {new Date(incident.updatedAt || incident.time).toLocaleTimeString()} IST
          </span>
        </div>
      </header>


      {/* ── 2. Primary Next-Step Action Banner ── */}
      {/* REJECTED: terminal state notice */}
      {incident.status === 'REJECTED' && (
        <section ref={actionRef} className={styles.actionBanner} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className={styles.actionBannerText}>
            <h3 style={{ color: '#FCA5A5' }}>✕ INCIDENT REJECTED</h3>
            <p style={{ color: 'rgba(252,165,165,0.7)' }}>
              {assessmentRecord
                ? `Rejected by ${assessmentRecord.officer?.name || 'an officer'}. Reason: "${assessmentRecord.rejectionReason || 'No reason provided'}".`
                : 'This incident has been reviewed and rejected by an authorizing officer. No dispatch actions are possible.'}
            </p>
          </div>
        </section>
      )}
      {/* NEEDS_INFORMATION: show re-assess option */}
      {incident.status === 'NEEDS_INFORMATION' && (
        <section ref={actionRef} className={styles.actionBanner} style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <div className={styles.actionBannerText}>
            <h3 style={{ color: '#FBBF24' }}>⚠ MORE INFORMATION REQUESTED</h3>
            <p style={{ color: 'rgba(251,191,36,0.7)' }}>
              {assessmentRecord?.infoRequestReason
                ? `Reason: "${assessmentRecord.infoRequestReason}". Re-assess once information is received.`
                : 'An officer has requested more information before this incident can be verified and dispatched.'}
            </p>
          </div>
          <div className={styles.actionBtnGroup}>
            <button
              id="btn-lifecycle-reassess"
              className={styles.primaryActionBtn}
              style={{ background: 'linear-gradient(135deg, #92400E, #B45309)' }}
              onClick={() => setShowAssessmentPanel(true)}
            >
              RE-ASSESS INCIDENT <ArrowRight size={13} />
            </button>
          </div>
        </section>
      )}
      {/* Standard flow actions */}
      {primaryAction && incident.status !== 'REJECTED' && incident.status !== 'NEEDS_INFORMATION' && (
        <section ref={actionRef} className={styles.actionBanner}>
          <div className={styles.actionBannerText}>
            <h3>RECOMMENDED LOGISTICS ACTION</h3>
            <p>
              {incident.status === 'REPORTED'
                ? 'This incident requires a formal officer assessment before it can be verified and dispatched.'
                : incident.status === 'VERIFIED'
                  ? 'Assign severity and resource priorities before matching logistics.'
                  : incident.status === 'PRIORITIZED'
                    ? 'Incident lacks allocated resources. Proceed to matching engine.'
                    : incident.status === 'RESOURCE_MATCHED'
                      ? 'Resources matches are approved. Proceed to authorize dispatch.'
                      : incident.status === 'UNDER_RESPONSE'
                        ? (incidentClosureCheck.ready
                          ? 'READY FOR CLOSURE: All incident demands are fully satisfied. System recommends resolution closure.'
                          : `ACTIVE: There are still ${incidentClosureCheck.activeCount} outstanding demands. Fulfill or cancel all demands to enable closure.`)
                        : `Next operational step: Advance incident stage to ${primaryAction.label.replace('MARK ', '')}.`}
            </p>
          </div>
          <div className={styles.actionBtnGroup}>
            <button
              id="btn-lifecycle-primary"
              className={styles.primaryActionBtn}
              style={(primaryAction as any).style}
              disabled={actionLoading}
              onClick={() => {
                setActionError(null);
                if ((primaryAction as any).isAssessment) {
                  setShowAssessmentPanel(true);
                } else if ((primaryAction as any).targetStatus) {
                  handleLifecycleAction((primaryAction as any).targetStatus);
                } else if ((primaryAction as any).navigate) {
                  (primaryAction as any).navigate();
                }
              }}
            >
              {actionLoading ? 'UPDATING…' : primaryAction.label} <ArrowRight size={13} />
            </button>
            {incident.status !== 'RESOLVED' && (
              <button
                id="btn-lifecycle-force-resolve"
                className={styles.secondaryActionBtn}
                disabled={actionLoading}
                onClick={() => {
                  setActionError(null);
                  handleLifecycleAction('RESOLVED');
                }}
              >
                Force Resolve
              </button>
            )}
          </div>
          {actionError && (
            <div style={{
              marginTop: '10px',
              padding: '8px 14px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '6px',
              color: '#FCA5A5',
              fontSize: '12px',
              lineHeight: 1.5
            }}>
              {actionError}
            </div>
          )}
        </section>
      )}


      {/* ── 3. Dual-Column Operational Case File Workspace ── */}
      <main className={styles.workspaceGrid}>
        {/* Left Column */}
        <div ref={leftColRef} className={styles.leftCol}>
          {/* Situation Summary */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>SITUATION ASSESSMENT</h2>
              <span className={styles.sectionSubtitle}>VERIFIED STATEMENT</span>
            </div>
            <div className={styles.situationContent}>
              <p>{incident.description || 'Flooding reported near Yamuna Bank low-lying sectors. Local evacuations are ongoing.'}</p>
            </div>
          </div>

          {/* Impact Metrics */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>IMPACT &amp; DEMAND SCALING</h2>
              <span className={styles.sectionSubtitle}>INTAKE PROFILE</span>
            </div>
            <div className={styles.impactGrid}>
              <div className={`${styles.impactCell} ${incident.severity === 'CRITICAL' ? styles.impactCellCritical : ''}`}>
                <span className={`${styles.impactNum} ${incident.severity === 'CRITICAL' ? styles.impactNumCritical : ''}`}>
                  {(incident.peopleAffected || 1200).toLocaleString()}
                </span>
                <span className={styles.impactLabel}>People Affected</span>
              </div>
              <div className={styles.impactCell}>
                <span className={styles.impactNum}>{(incident.displacedCount || 450).toLocaleString()}</span>
                <span className={styles.impactLabel}>Estimated Displaced</span>
              </div>
              <div className={styles.impactCell}>
                <span className={styles.impactNum}>{incidentRequests.length || 1}</span>
                <span className={styles.impactLabel}>Outstanding Demands</span>
              </div>
              <div className={styles.impactCell}>
                <span className={styles.impactNum}>{incident.source || 'COMMAND CENTRE'}</span>
                <span className={styles.impactLabel}>SOURCE ROUTING</span>
              </div>
            </div>
          </div>

          {/* Response Progress Timeline */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>RESPONSE STAGE</h2>
              <span className={styles.sectionSubtitle}>LIFECYCLE</span>
            </div>
            <div className={styles.stageTimeline}>
              {stages.map((stage, idx) => {
                const isCompleted = idx <= currentStageIndex;
                const isActive = idx === currentStageIndex;
                return (
                  <div
                    key={stage}
                    className={`${styles.stageNode} ${isCompleted ? styles.stageCompleted : ''} ${isActive ? styles.stageActive : ''}`}
                  >
                    <div className={styles.stageDot} />
                    <span className={styles.stageLabel}>{stage.replace(/_/g, ' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Geographic Context Map */}
          <div className={styles.mapCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>GEOGRAPHIC CONTEXT MAP</h2>
              <span className={styles.sectionSubtitle}>LIVE MARKERS</span>
            </div>
            <div className={styles.mapContainer}>
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
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div ref={rightColRef} className={styles.rightCol}>
          {/* Resolution Card if resolved */}
          {incident.status === 'RESOLVED' && (
            <div className={`${styles.card} ${styles.resolutionCard}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} style={{ color: '#059669' }}>✓ RESOLUTION SUMMARY</h2>
                <span className={styles.sectionSubtitle} style={{ color: '#059669' }}>CLOSED TASK</span>
              </div>
              <p className={styles.eventDesc}>
                This incident has been fully resolved. Response assets returned to depots and shelter capacities are within baseline.
              </p>
              <div className={styles.resStatGrid}>
                <div className={styles.resStatCell}>
                  <span className={styles.resStatVal}>12h 45m</span>
                  <span className={styles.resStatLabel}>RESPONSE DURATION</span>
                </div>
                <div className={styles.resStatCell}>
                  <span className={styles.resStatVal}>{(incident.peopleAffected || 1200)}</span>
                  <span className={styles.resStatLabel}>ASSISTED</span>
                </div>
                <div className={styles.resStatCell}>
                  <span className={styles.resStatVal}>3</span>
                  <span className={styles.resStatLabel}>UNITS DEPLOYED</span>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Audit Record — shown for assessed incidents */}
          {assessmentRecord && (
            <div className={styles.card} style={{
              border: assessmentRecord.decision === 'CONFIRMED' ? '1px solid rgba(16,185,129,0.25)' :
                assessmentRecord.decision === 'REJECTED' ? '1px solid rgba(239,68,68,0.25)' :
                '1px solid rgba(234,179,8,0.25)'
            }}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle} style={{
                  color: assessmentRecord.decision === 'CONFIRMED' ? '#34D399' :
                    assessmentRecord.decision === 'REJECTED' ? '#FCA5A5' : '#FBBF24'
                }}>
                  {assessmentRecord.decision === 'CONFIRMED' ? '✓ INCIDENT CONFIRMED' :
                   assessmentRecord.decision === 'REJECTED' ? '✕ INCIDENT REJECTED' :
                   '⚠ AWAITING MORE INFO'}
                </h2>
                <span className={styles.sectionSubtitle}>OFFICER ASSESSMENT RECORD</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'rgba(250,248,243,0.45)', minWidth: '90px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>OFFICER</span>
                  <span style={{ color: '#FAF8F3', fontWeight: 600 }}>{assessmentRecord.officer?.name || 'Unknown'}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'rgba(250,248,243,0.45)', minWidth: '90px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>ROLE</span>
                  <span style={{ color: '#FAF8F3' }}>{assessmentRecord.officer?.role || '—'}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'rgba(250,248,243,0.45)', minWidth: '90px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TIMESTAMP</span>
                  <span style={{ color: '#FAF8F3' }}>
                    {new Date(assessmentRecord.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'rgba(250,248,243,0.45)', minWidth: '90px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>NOTE</span>
                  <span style={{ color: 'rgba(250,248,243,0.8)', fontStyle: 'italic' }}>"{assessmentRecord.assessmentNote}"</span>
                </div>
                {assessmentRecord.corroborationCount !== null && assessmentRecord.corroborationCount !== undefined && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: 'rgba(250,248,243,0.45)', minWidth: '90px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>NEARBY</span>
                    <span style={{ color: '#FAF8F3' }}>{assessmentRecord.corroborationCount} corroborating report{assessmentRecord.corroborationCount !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {assessmentRecord.rejectionReason && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: 'rgba(250,248,243,0.45)', minWidth: '90px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>REASON</span>
                    <span style={{ color: '#FCA5A5' }}>{assessmentRecord.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Resource Needs */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>OUTSTANDING RESOURCE NEEDS</h2>
              <span className={styles.sectionSubtitle}>LOGISTICS REQUISITIONS</span>
            </div>
            <div className={styles.needsStack}>
              {incidentRequests.length > 0 ? (
                incidentRequests.map(req => {
                  let needState: 'UNMATCHED' | 'MATCHED' | 'DISPATCHED' | 'FULFILLED' = 'UNMATCHED';
                  if (req.status === 'FULFILLED') needState = 'FULFILLED';
                  else if (req.status === 'DISPATCHED' || req.status === 'FULFILLING') needState = 'DISPATCHED';
                  else if (req.status === 'ALLOCATED') needState = 'MATCHED';

                  return (
                    <div key={req.id} className={styles.needItem}>
                      <div className={styles.needMeta}>
                        <span className={styles.needTitle}>{req.itemNeeded}</span>
                        <span className={styles.needQty}>{req.quantity.toLocaleString()} {req.unit} Needed · {req.zoneName}</span>
                      </div>
                      <div className={styles.needActions}>
                        <span className={`${styles.needStateBadge} ${styles['state' + needState]}`}>
                          {needState}
                        </span>
                        {needState === 'UNMATCHED' && (
                          <button
                            className={styles.findMatchBtn}
                            onClick={() => navigate(`/operations/matching?requestId=${req.id}`)}
                          >
                            Find Match
                          </button>
                        )}
                        {needState === 'MATCHED' && (
                          <button
                            className={styles.findMatchBtn}
                            style={{ backgroundColor: '#2563EB' }}
                            onClick={() => navigate(`/operations/dispatch?allocationId=${req.id}`)}
                          >
                            Dispatch
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.needItem}>
                  <div className={styles.needMeta}>
                    <span className={styles.needTitle}>General Relief Packages</span>
                    <span className={styles.needQty}>Standard issue deployment</span>
                  </div>
                  <span className={`${styles.needStateBadge} ${styles.stateUNMATCHED}`}>
                    UNMATCHED
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Active Response Assets */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>ACTIVE RESPONSE ASSETS</h2>
              <span className={styles.sectionSubtitle}>VEHICLES &amp; PAYLOADS</span>
            </div>
            <div className={styles.activeResList}>
              {activeDispatches.length > 0 ? (
                activeDispatches.map(v => (
                  <div key={v.id} className={styles.resCard}>
                    <div className={styles.resHeader}>
                      <span className={styles.resId}>{v.id}</span>
                      <span className={styles.resStatusBadge}>{v.status}</span>
                    </div>
                    <h4>{v.name}</h4>
                    <div className={styles.resMetaRow}>
                      <span>Driver: {v.driverName}</span>
                      <span>ETA: ~14 mins</span>
                    </div>
                    {v.cargo && <div className={styles.resCargo}>Cargo: {v.cargo}</div>}
                  </div>
                ))
              ) : (
                <p className={styles.eventDesc} style={{ opacity: 0.6, fontStyle: 'italic' }}>
                  No active vehicles or responders are currently en route to this incident coordinates.
                </p>
              )}
            </div>
          </div>

          {/* Nearby Shelters */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>NEARBY RELIEF SHELTERS</h2>
              <span className={styles.sectionSubtitle}>CAPACITY STATUS</span>
            </div>
            <div className={styles.shelterList}>
              {nearbyShelters.map(shelter => {
                const occupancyPct = Math.round((shelter.capacityOccupied / shelter.capacityTotal) * 100);
                const isHigh = occupancyPct > 90;
                const isMid = occupancyPct > 70;
                return (
                  <div key={shelter.id} className={styles.shelterCard}>
                    <div className={styles.shelterHeader}>
                      <h4 className={styles.shelterName}>{shelter.name}</h4>
                      <span className={styles.shelterBeds}>{shelter.capacityTotal - shelter.capacityOccupied} Beds Available</span>
                    </div>
                    <div className={styles.capacityBar}>
                      <div
                        className={`${styles.capacityFill} ${
                          isHigh ? styles.capacityFillAlert : isMid ? styles.capacityFillWarn : ''
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                    <div className={styles.shelterCardFooter}>
                      <span>Occupancy: {occupancyPct}%</span>
                      <span>📍 {shelter.locationName.split(',')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident Chronological Timeline - uses backend data when available */}
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>RESPONSE CHRONOLOGY</h2>
              <span className={styles.sectionSubtitle}>TIMELINE LOG</span>
            </div>
            <div className={styles.timelineFeed}>
              {backendTimeline.length > 0 ? (
                // Render real backend timeline events (newest first)
                [...backendTimeline].reverse().map((entry, idx) => (
                  <div key={entry.id || idx} className={styles.timelineEvent}>
                    <div className={`${styles.timelineDot} ${idx === 0 ? styles.timelineDotActive : ''}`} />
                    <span className={styles.eventTime}>
                      {new Date(entry.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
                      })}
                    </span>
                    <div className={styles.eventContent}>
                      <h4 className={styles.eventTitle}>{entry.eventType?.replace(/_/g, ' ')}</h4>
                      <p className={styles.eventDesc}>{entry.message}</p>
                      {entry.actor && (
                        <p style={{ fontSize: '10px', color: 'rgba(250,248,243,0.3)', marginTop: '2px' }}>
                          — {entry.actor.name} ({entry.actor.role})
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : incident.timeline && incident.timeline.length > 0 ? (
                // Fallback to static frontend timeline
                incident.timeline.map((entry, idx) => (
                  <div key={idx} className={styles.timelineEvent}>
                    <div className={`${styles.timelineDot} ${idx === 0 ? styles.timelineDotActive : ''}`} />
                    <span className={styles.eventTime}>{entry.time}</span>
                    <div className={styles.eventContent}>
                      <h4 className={styles.eventTitle}>{entry.title}</h4>
                      <p className={styles.eventDesc}>{entry.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.eventDesc}>No logs registered.</p>
              )}
            </div>
            <form onSubmit={handleAddTimelineLog} className={styles.timelineLogForm}>
              <input
                type="text"
                className={styles.timelineLogInput}
                placeholder="Log secondary situational update..."
                value={newLogText}
                onChange={(e) => setNewLogText(e.target.value)}
              />
              <button type="submit" className={styles.timelineLogBtn}>
                LOG
              </button>
            </form>
          </div>


        </div>
      </main>

      {/* ── 4. Guide System ── */}
      <PageGuidebook guideKey="incidentWorkspace" />
    </div>
  );
};

export default IncidentWorkspace;
