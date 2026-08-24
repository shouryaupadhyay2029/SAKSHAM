import React, {
  useState, useMemo, useEffect, useRef, useCallback
} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Search, X, Check, ChevronDown, ChevronUp, ArrowRight, Info } from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import { useTranslation } from 'react-i18next';
import { EmptyState, NoResultsState } from '../../components/ui/SystemStates';
import { MapView } from '../../components/map/MapView';
import apiClient from '../../services/apiClient';
import {
  matchResources,
  MATCH_WEIGHTS,
  type MatchResult,
  type MatchEngineOutput,
} from '../../engine/matchingEngine';
import type { DemandRequest } from '../../types/request';
import type { ResourceItem } from '../../types/resource';
import styles from './DemandMatching.module.css';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';
import { ShaderBackground } from '../../components/ui/ShaderBackground';

import GradientBackground from '../../components/ui/noisy-gradient-backgrounds';

gsap.registerPlugin(ScrollTrigger);

/* ─── Constants ──────────────────────────────────────────────────────────── */

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#C0392B', HIGH: '#E86F16', MEDIUM: '#D4A017', LOW: '#2E7D32',
};

const QUALITY_CFG: Record<string, { label: string; color: string }> = {
  EXCELLENT:    { label: 'EXCELLENT MATCH', color: '#2E7D32' },
  GOOD:         { label: 'GOOD MATCH',      color: '#0B2119' },
  PARTIAL:      { label: 'PARTIAL MATCH',   color: '#E86F16' },
  POOR:         { label: 'POOR MATCH',      color: '#C0392B' },
  INCOMPATIBLE: { label: 'INCOMPATIBLE',    color: '#6B7280' },
};

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

// Simple power2.out ease without GSAP dependency
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

function useCountUp(target: number, duration = 1400, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    let frame = 0;
    const total = Math.ceil(duration / 16);
    const timer = setInterval(() => {
      frame++;
      const progress = easeOut(Math.min(frame / total, 1));
      setVal(Math.round(target * progress));
      if (frame >= total) { setVal(target); clearInterval(timer); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return val;
}

function useAnimatedBar(target: number, max: number, active = false) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!active) { setWidth(0); return; }
    setTimeout(() => setWidth((target / max) * 100), 80);
  }, [target, max, active]);
  return width;
}

/* ─── SVG Radial Score Meter ─────────────────────────────────────────────── */

interface RadialScoreProps {
  score: number;
  maxScore?: number;
  active: boolean;
  color?: string;
}

const RadialScore: React.FC<RadialScoreProps> = ({
  score, maxScore = 100, active, color = '#0B2119'
}) => {
  const displayed = useCountUp(score, 1600, active);
  const R = 52;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * R;
  const progress = active ? (score / maxScore) * circumference : 0;

  return (
    <div className={styles.radialWrap}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        {/* Track */}
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke="rgba(11,33,25,0.07)" strokeWidth={5} />
        {/* Fill */}
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className={styles.radialCenter}>
        <span className={styles.radialNum}>{displayed}</span>
        <span className={styles.radialDenom}>/100</span>
      </div>
    </div>
  );
};

/* ─── Score Bar Row ──────────────────────────────────────────────────────── */

interface ScoreBarRowProps {
  label: string;
  value: number;
  max: number;
  active: boolean;
}
const ScoreBarRow: React.FC<ScoreBarRowProps> = ({ label, value, max, active }) => {
  const width = useAnimatedBar(value, max, active);
  return (
    <div className={styles.scoreBarRow}>
      <span className={styles.scoreBarLabel}>{label}</span>
      <div className={styles.scoreBarTrack}>
        <div className={styles.scoreBarFill}
          style={{ width: `${width}%`, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
      <span className={styles.scoreBarVal}>{value}<span className={styles.scoreBarMax}>/{max}</span></span>
    </div>
  );
};

/* ─── Single Match Row ───────────────────────────────────────────────────── */



/* ─── Network Status ─────────────────────────────────────────────────────── */

interface NetworkStatusProps {
  resources: ResourceItem[];
  requests: DemandRequest[];
}
const NetworkStatus: React.FC<NetworkStatusProps> = ({ resources, requests }) => {
  const activeDepots   = new Set(resources.filter(r => r.status === 'AVAILABLE').map(r => r.locationName)).size;
  const available      = resources.filter(r => r.status === 'AVAILABLE' && r.quantity > 0).length;
  const allocated      = requests.filter(r => ['ALLOCATED', 'MATCHED', 'DISPATCHED'].includes(r.status)).length;
  const pending        = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className={styles.networkStatus}>
      <span className={styles.networkLabel}>NETWORK</span>
      <div className={styles.networkStats}>
        <span><strong>{activeDepots}</strong> depots</span>
        <span><strong>{available}</strong> available</span>
        <span><strong>{allocated}</strong> allocated</span>
        <span><strong>{pending}</strong> pending</span>
      </div>
    </div>
  );
};

/* ─── Recommendation Panel ───────────────────────────────────────────────── */

interface RecommendationPanelProps {
  bestMatch: MatchResult;
  demand: DemandRequest;
  resourceMap: Map<string, ResourceItem>;
  animateScore: boolean;
  onAuthorize: () => void;
  onAlternatives: () => void;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  bestMatch, demand, resourceMap, animateScore, onAuthorize, onAlternatives
}) => {
  const res = resourceMap.get(bestMatch.resourceId);
  const qc = QUALITY_CFG[bestMatch.qualityLabel] ?? QUALITY_CFG.POOR;
  const remaining = (res?.quantity ?? 0) - demand.quantity;

  if (!res) return null;

  return (
    <aside className={styles.recommendPanel}>
      <div className={styles.rpHeader}>
        <span className={styles.rpEyebrow}>RECOMMENDED MATCH</span>
        <div className={styles.rpScoreRow}>
          <RadialScore score={bestMatch.matchScore} active={animateScore} color={qc.color} />
          <div className={styles.rpScoreInfo}>
            <span className={styles.rpQualityTag} style={{ color: qc.color }}>{qc.label}</span>
            <h3 className={styles.rpResourceName}>{res.name}</h3>
            <span className={styles.rpDepotName}>{res.locationName.split(',')[0]}</span>
          </div>
        </div>
      </div>

      <div className={styles.rpMetaGrid}>
        <div className={styles.rpMetaCell}>
          <span className={styles.rpMetaLabel}>REQUESTED</span>
          <span className={styles.rpMetaVal}>{demand.quantity.toLocaleString()} {demand.unit}</span>
        </div>
        <div className={styles.rpMetaCell}>
          <span className={styles.rpMetaLabel}>AVAILABLE</span>
          <span className={styles.rpMetaVal}>{res.quantity.toLocaleString()} {res.unit}</span>
        </div>
        <div className={styles.rpMetaCell}>
          <span className={styles.rpMetaLabel}>DISTANCE</span>
          <span className={styles.rpMetaVal}>{bestMatch.distanceKm} km</span>
        </div>
        <div className={styles.rpMetaCell}>
          <span className={styles.rpMetaLabel}>FULFILLMENT</span>
          <span className={styles.rpMetaVal} style={{ color: bestMatch.canFullyFulfill ? '#2E7D32' : '#E86F16' }}>
            {bestMatch.canFullyFulfill ? 'FULL' : 'PARTIAL'}
          </span>
        </div>
      </div>

      <div className={styles.rpReasons}>
        <span className={styles.rpSectionLabel}>WHY THIS MATCH?</span>
        {bestMatch.reasoning.map((r, i) => (
          <div key={i} className={styles.rpReason} style={{ animationDelay: `${i * 100 + 200}ms` }}>
            <Check size={9} className={styles.rpCheck} />
            <span>{r}</span>
          </div>
        ))}
      </div>

      <div className={styles.rpDecision}>
        <span className={styles.rpSectionLabel}>ALLOCATION DECISION</span>
        <div className={styles.rpDecisionGrid}>
          <div className={styles.rpDecisionCell}>
            <span className={styles.rpDecisionLabel}>Recommended allocation</span>
            <span className={styles.rpDecisionVal}>{demand.quantity.toLocaleString()} {demand.unit}</span>
          </div>
          <div className={styles.rpDecisionCell}>
            <span className={styles.rpDecisionLabel}>Remaining depot stock</span>
            <span className={styles.rpDecisionVal} style={{ color: remaining <= 0 ? '#C0392B' : undefined }}>
              {remaining > 0 ? `${remaining.toLocaleString()} ${res.unit}` : 'DEPLETED'}
            </span>
          </div>
        </div>
        <p className={styles.rpDecisionNote}>
          The engine recommends this allocation. Authorized operator confirmation required before commitment.
        </p>
        <button className={styles.rpAuthorizeBtn} onClick={onAuthorize}>
          AUTHORIZE ALLOCATION <ArrowRight size={12} />
        </button>
        <button className={styles.rpAlternativesBtn} onClick={onAlternatives}>
          REVIEW ALTERNATIVES
        </button>
      </div>
    </aside>
  );
};



/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════ */

export const DemandMatching: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requests, resources, incidents, allocateResourceToRequest } = useOperationalState();

  /* — State — */
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedDemand, setSelectedDemand] = useState<DemandRequest | null>(null);
  const [isAnalyzing, setIsAnalyzing]       = useState(false);
  const [matchOutput, setMatchOutput]       = useState<MatchEngineOutput | null>(null);
  const [showResults, setShowResults]       = useState(false);
  const [animateScore, setAnimateScore]     = useState(false);
  const [reviewTarget, setReviewTarget]     = useState<MatchResult | null>(null);
  const [showReview, setShowReview]         = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showScoringLogic, setShowScoringLogic] = useState(false);
  const [allocationId, setAllocationId]     = useState<string | null>(null);
  const [scoringActive, setScoringActive]   = useState(false);

  /* — Refs — */
  const pageRef        = useRef<HTMLDivElement>(null);
  const heroRef        = useRef<HTMLElement>(null);
  const selectorRef    = useRef<HTMLDivElement>(null);
  const workspaceRef   = useRef<HTMLDivElement>(null);

  /* — Resource map — */
  const resourceMap = useMemo(
    () => new Map(resources.map(r => [r.id, r])),
    [resources]
  );

  /* — Matchable demands — */
  const matchableDemands = useMemo(
    () => requests.filter(r => r.status === 'PENDING' || r.status === 'MATCHED'),
    [requests]
  );

  const filteredDemands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchableDemands;
    return matchableDemands.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.zoneName.toLowerCase().includes(q) ||
      r.itemNeeded.toLowerCase().includes(q) ||
      r.priority.toLowerCase().includes(q)
    );
  }, [matchableDemands, searchQuery]);

  /* — Allocation state — */
  const liveSelectedDemand = selectedDemand
    ? requests.find(r => r.id === selectedDemand.id)
    : null;
  const isAllocated = liveSelectedDemand?.status === 'ALLOCATED';

  /* ── GSAP entrance animation ── */
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ctx: any;
    try {
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        if (heroRef.current) {
          tl.fromTo(heroRef.current,
            { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 0);
        }
        if (selectorRef.current) {
          tl.fromTo(selectorRef.current,
            { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2);
        }
        tl.fromTo(`.${styles.demandQueueRow}`,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.07 }, 0.35);
      }, pageRef);
    } catch (e) {
      console.error("GSAP entrance animation failed:", e);
    }

    return () => {
      if (ctx) ctx.revert();
    };
  }, [filteredDemands.length]);

  /* ── Run matching engine ── */
  const runMatching = useCallback(async (demand: DemandRequest) => {
    setIsAnalyzing(true);
    setShowResults(false);
    setAnimateScore(false);
    setMatchOutput(null);
    setReviewTarget(null);
    setShowReview(false);
    setAllocationId(null);
    setShowAlternatives(false);

    let backendPlan: any = null;
    try {
      try {
        const res = await apiClient.getDispatchPlan(demand.id);
        if (res && res.data) {
          backendPlan = res.data;
          console.log('[OPTIMIZATION DISPATCH PLAN] Backend recommendation:', backendPlan);
        }
      } catch (err) {
        console.warn('[OPTIMIZATION DISPATCH PLAN ERROR] Failed to fetch backend dispatch plan:', err);
      }

      const output = matchResources(demand, resources, { otherRequests: requests });
      
      // Merge backend recommendation info into output bestMatch if available
      if (backendPlan && output.bestMatch) {
        const dbRes = resources.find(r => r.id === backendPlan.resourceId);
        if (dbRes) {
          const bestMatch = output.bestMatch as any;
          bestMatch.resourceId = dbRes.id;
          bestMatch.vehicleId = backendPlan.vehicleId;
          bestMatch.distanceKm = Math.round(backendPlan.distance_meters / 100) / 10;
          bestMatch.durationMinutes = Math.round(backendPlan.duration_seconds / 60);
          bestMatch.geometry = backendPlan.geometry;
        }
      }

      setMatchOutput(output);
      if (output.bestMatch) {
        setReviewTarget(output.bestMatch);
      }
    } catch (engineErr) {
      console.error('[MATCHING ENGINE FATAL ERROR]', engineErr);
    } finally {
      setIsAnalyzing(false);
    }

    // Animate workspace in
    setTimeout(() => {
      setShowResults(true);
      setTimeout(() => setAnimateScore(true), 150);

      // Stagger rows
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion && workspaceRef.current) {
        gsap.fromTo(workspaceRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
        gsap.fromTo(`.${styles.matchRow}`,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.09, delay: 0.1, ease: 'power2.out' }
        );
      }
    }, 40);
  }, [resources, requests]);

  const handleSelectDemand = (demand: DemandRequest) => {
    setSelectedDemand(demand);
    setSearchQuery('');
    runMatching(demand);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && selectorRef.current) {
      // Shrink selector area subtly
      gsap.to(`.${styles.demandQueueRow}:not(.${styles.demandRowActive})`,
        { opacity: 0.35, duration: 0.3 }
      );
    }
  };

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleConfirmAllocation = async () => {
    if (!selectedDemand || !reviewTarget) return;
    setIsConfirming(true);
    setConfirmError(null);
    try {
      const id = await allocateResourceToRequest(selectedDemand.id, reviewTarget.resourceId, selectedDemand.quantity);
      setAllocationId(id);
      setShowConfirm(false);
      setShowReview(false);
    } catch (err: any) {
      console.error('[CONFIRM MATCH ERROR]:', err);
      setConfirmError(err.message || 'An error occurred during resource matching. Authorized officer required.');
    } finally {
      setIsConfirming(false);
    }
  };

  /* ─── Scoring logic bar animation ─── */
  useEffect(() => {
    if (showScoringLogic) setTimeout(() => setScoringActive(true), 80);
    else setScoringActive(false);
  }, [showScoringLogic]);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const reqId = searchParams.get('requestId');
    if (reqId) {
      const req = requests.find(r => r.id === reqId);
      if (req && (!selectedDemand || selectedDemand.id !== req.id)) {
        handleSelectDemand(req);
      }
    }
  }, [requests, searchParams, selectedDemand]);

  /* ══════════════════════ RENDER ════════════════════════ */
  return (
    <div ref={pageRef} className={styles.page}>
      <GradientBackground />

      {/* ── Operational Header ── */}
      <header ref={heroRef} className={`${styles.hero} shaderHeaderWrapper`}>
        <ShaderBackground className="absolute inset-0" />
        <div className={styles.heroLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={styles.heroEyebrow} style={{ marginBottom: 0 }}>{t('matching.title')}</span>
            <PageGuideTrigger />
          </div>
          <h1 className={styles.heroTitle}>{t('matching.title')}</h1>
          <p className={styles.heroLead}>
            {t('matching.subtitle')}
          </p>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.engineStatus}>
            <span className={styles.engineDot} />
            <span className={styles.engineLabel}>{t('common.active')}</span>
          </div>
          <p className={styles.engineSub}>{t('matching.aiMatchConfidence')}</p>
          <NetworkStatus resources={resources} requests={requests} />
        </div>
      </header>

      {/* ── Demand Selection Workspace ── */}
      <div ref={selectorRef} className={styles.selectorWorkspace}>
        <div className={styles.selectorTop}>
          <span className={styles.selectorEyebrow}>{t('demands.title')}</span>
          <div className={styles.searchBox}>
            <Search size={13} className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t('demands.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Demand Queue */}
        <div className={styles.demandQueue}>
          {matchableDemands.length === 0 ? (
            <EmptyState
              title={t('matching.noMatches')}
              description={t('matching.noMatches')}
              iconType="check"
            />
          ) : filteredDemands.length === 0 ? (
            <NoResultsState
              query={searchQuery}
              onClear={() => setSearchQuery('')}
            />
          ) : (
            filteredDemands.map(d => {
              const isActive = selectedDemand?.id === d.id;
              return (
                <div
                  key={d.id}
                  style={{
                    borderBottom: '1px solid rgba(11, 33, 25, 0.08)',
                    background: isActive ? 'rgba(232, 111, 22, 0.02)' : 'transparent',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    transition: 'all 0.2s ease',
                    border: isActive ? '1px solid rgba(232, 111, 22, 0.15)' : '1px solid transparent',
                  }}
                >
                  <button
                    className={`${styles.demandQueueRow} ${isActive ? styles.demandRowActive : ''}`}
                    onClick={() => handleSelectDemand(d)}
                    style={{ borderBottom: 'none' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className={styles.dqId}>{d.id}</span>
                      <span style={{ fontSize: '9.5px', color: '#11281e', marginTop: '2px', fontWeight: 700 }}>
                        {d.incidentId ? d.incidentId : 'No Incident'}
                      </span>
                    </div>
                    <span className={styles.dqPriority} style={{ color: PRIORITY_COLOR[d.priority] }}>{t(`severity.${d.priority}`) || d.priority}</span>
                    <span className={styles.dqQty}>{d.quantity.toLocaleString()} {d.unit}</span>
                    <span className={styles.dqItem}>{d.itemNeeded}</span>
                    <span className={styles.dqZone} title={d.detailedAddress || d.zoneName}>
                      {d.detailedAddress ? (d.detailedAddress.length > 25 ? `${d.detailedAddress.substring(0, 25)}...` : d.detailedAddress) : d.zoneName}
                    </span>
                    <span className={styles.dqAffected}>{d.affectedCount.toLocaleString()}</span>
                    <span className={styles.dqStatus}>{t(`status.${d.status}`) || d.status}</span>
                    <ArrowRight size={12} className={styles.dqArrow} style={{ transform: isActive ? 'rotate(90deg)' : 'none' }} />
                  </button>

                  {isActive && (
                    <div
                      style={{
                        padding: '24px',
                        backgroundColor: 'rgba(11, 33, 25, 0.015)',
                        borderTop: '1px dashed rgba(11, 33, 25, 0.08)',
                        fontSize: '12px',
                        color: '#0B2119',
                        animation: 'fadeIn 0.25s ease-out',
                      }}
                    >
                      {/* 1. Demand Core Info Metadata Row */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '20px',
                          marginBottom: '24px',
                          paddingBottom: '20px',
                          borderBottom: '1px solid rgba(11, 33, 25, 0.06)',
                        }}
                      >
                        <div>
                          <strong style={{ display: 'block', fontSize: '9px', color: 'rgba(11, 33, 25, 0.5)', letterSpacing: '0.05em', marginBottom: '4px' }}>DESCRIPTION</strong>
                          <span style={{ fontSize: '13px', lineHeight: 1.4, fontWeight: 500 }}>{d.description || 'No description provided.'}</span>
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '9px', color: 'rgba(11, 33, 25, 0.5)', letterSpacing: '0.05em', marginBottom: '4px' }}>FULL LOCATION DETAILS</strong>
                          <span style={{ fontSize: '12.5px', lineHeight: 1.4 }}>{d.detailedAddress || d.zoneName}</span>
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '9px', color: 'rgba(11, 33, 25, 0.5)', letterSpacing: '0.05em', marginBottom: '4px' }}>COORDINATES & SECTOR</strong>
                          <span style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>Lat: {d.coordinates.lat.toFixed(5)} · Lng: {d.coordinates.lng.toFixed(5)} ({d.zoneName})</span>
                        </div>
                        <div>
                          <strong style={{ display: 'block', fontSize: '9px', color: 'rgba(11, 33, 25, 0.5)', letterSpacing: '0.05em', marginBottom: '4px' }}>REQUEST TIMESTAMP</strong>
                          <span style={{ fontSize: '11.5px' }}>{new Date(d.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                        </div>
                      </div>

                      {/* 2. Inline Matching Workspace */}
                      {isAnalyzing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '32px 0', justifyContent: 'center' }}>
                          <span className={styles.pulseDot} />
                          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(11, 33, 25, 0.7)' }}>
                            ENGINE ANALYZING DEMAND → SCORING CANDIDATES
                          </span>
                        </div>
                      ) : showResults && matchOutput ? (
                        <div className={styles.matchingWorkspaceGrid}>
                          {/* Left Column: Recommendations, Candidates, and Scoring */}
                          <div>
                            {isAllocated && allocationId ? (
                              <div className={styles.allocatedState} style={{ margin: 0, padding: '24px' }}>
                                <div className={styles.allocCheck}><Check size={20} /></div>
                                <h3>RESOURCE ALLOCATED</h3>
                                <p>Ref: {allocationId}</p>
                                <div className={styles.allocStateGrid}>
                                  {[
                                    ['DEMAND', 'ALLOCATED'],
                                    ['RESOURCE', 'COMMITTED'],
                                    ['INCIDENT', 'RESOURCE MATCHED'],
                                    ['NEXT', 'VEHICLE DISPATCH →']
                                  ].map(([k, v]) => (
                                    <div key={k}><span>{k}</span><strong>{v}</strong></div>
                                  ))}
                                </div>
                                <p className={styles.allocNote}>Ready for Dispatch &amp; Logistics phase. No vehicle has been assigned yet.</p>
                                <button
                                  className={styles.goToDispatchBtn}
                                  onClick={() => navigate(`/operations/dispatch?allocationId=${d.id}`)}
                                >
                                  Go to Dispatch Console <ArrowRight size={14} />
                                </button>
                              </div>
                            ) : showConfirm && reviewTarget ? (
                              (() => {
                                const res = resourceMap.get(reviewTarget.resourceId);
                                if (!res) return null;
                                const remaining = res.quantity - d.quantity;
                                return (
                                  <div
                                    style={{
                                      backgroundColor: '#ffffff',
                                      border: '1.5px solid rgba(232, 111, 22, 0.25)',
                                      padding: '24px',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                                      animation: 'scaleIn 0.2s ease-out',
                                    }}
                                  >
                                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#E86F16', letterSpacing: '0.05em', marginBottom: '16px', textTransform: 'uppercase' }}>
                                      CONFIRM RESOURCE ALLOCATION
                                    </h3>
                                    <div className={styles.modalRows}>
                                      {[
                                        ['DEMAND ID', d.id],
                                        ['RESOURCE TYPE', res.name],
                                        ['DEPOT NAME', res.locationName.split(',')[0]],
                                        ['QUANTITY REQUIRED', `${d.quantity.toLocaleString()} ${res.unit}`],
                                        ['REMAINING DEPOT STOCK', remaining > 0 ? `${remaining.toLocaleString()} ${res.unit}` : 'DEPLETED after allocation'],
                                      ].map(([label, val]) => (
                                        <div key={label} className={styles.modalRow} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(11, 33, 25, 0.05)' }}>
                                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(11, 33, 25, 0.5)' }}>{label}</span>
                                          <strong style={{ fontSize: '12px', color: label.includes('REMAINING') && remaining <= 0 ? '#C0392B' : '#0B2119' }}>{val}</strong>
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', margin: '16px 0', justifyContent: 'space-between' }}>
                                      {[['DEMAND', '→ ALLOCATED'], ['RESOURCE', '→ COMMITTED'], ['VEHICLE', '→ PENDING']].map(([k, v]) => (
                                        <div key={k} style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'rgba(11,33,25,0.03)', borderRadius: '4px', border: '1px solid rgba(11,33,25,0.05)' }}>
                                          <span style={{ display: 'block', fontSize: '8px', color: 'rgba(11,33,25,0.4)', fontWeight: 700 }}>{k}</span>
                                          <strong style={{ fontSize: '10px', color: '#0B2119' }}>{v}</strong>
                                        </div>
                                      ))}
                                    </div>
                                    {confirmError && (
                                      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #EF4444', color: '#EF4444', padding: '12px', borderRadius: '4px', fontSize: '11px', lineHeight: 1.4, margin: '12px 0', textAlign: 'left' }}>
                                        ⚠ {confirmError}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                      <button
                                        disabled={isConfirming}
                                        onClick={() => { setShowConfirm(false); setShowReview(true); }}
                                        style={{ flex: 1, padding: '11px', borderRadius: '4px', border: '1px solid rgba(11,33,25,0.15)', background: 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        BACK TO REVIEW
                                      </button>
                                      <button
                                        disabled={isConfirming}
                                        onClick={handleConfirmAllocation}
                                        style={{ flex: 1, padding: '11px', borderRadius: '4px', border: 'none', background: '#E86F16', color: '#ffffff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        {isConfirming ? 'CONFIRMING...' : 'CONFIRM ALLOCATION'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : showReview && reviewTarget ? (
                              (() => {
                                const res = resourceMap.get(reviewTarget.resourceId);
                                if (!res) return null;
                                const remaining = res.quantity - d.quantity;
                                return (
                                  <div
                                    style={{
                                      backgroundColor: '#ffffff',
                                      border: '1px solid rgba(11, 33, 25, 0.12)',
                                      padding: '24px',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                                      animation: 'fadeIn 0.2s ease-out',
                                    }}
                                  >
                                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0B2119', letterSpacing: '0.05em', marginBottom: '16px' }}>
                                      MATCH REVIEW &amp; AUTHORIZATION
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                      <div style={{ padding: '10px', background: 'rgba(11,33,25,0.02)', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '8px', color: 'rgba(11,33,25,0.4)', fontWeight: 700, display: 'block' }}>DEMAND REQUEST</span>
                                        <strong style={{ fontSize: '11.5px', color: '#0B2119', display: 'block', margin: '2px 0' }}>{d.id}</strong>
                                        <span style={{ fontSize: '11px', color: 'rgba(11,33,25,0.6)' }}>{d.quantity.toLocaleString()} {d.unit} Water</span>
                                      </div>
                                      <div style={{ padding: '10px', background: 'rgba(11,33,25,0.02)', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '8px', color: 'rgba(11,33,25,0.4)', fontWeight: 700, display: 'block' }}>DEPOT CANDIDATE</span>
                                        <strong style={{ fontSize: '11.5px', color: '#0B2119', display: 'block', margin: '2px 0' }}>{res.name}</strong>
                                        <span style={{ fontSize: '11px', color: 'rgba(11,33,25,0.6)' }}>{res.locationName.split(',')[0]}</span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                      <div style={{ padding: '10px', background: 'rgba(11,33,25,0.02)', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '8px', color: 'rgba(11,33,25,0.4)', fontWeight: 700, display: 'block' }}>ROUTING DISTANCE</span>
                                        <strong style={{ fontSize: '13px', color: '#0B2119' }}>{reviewTarget.distanceKm} km</strong>
                                      </div>
                                      <div style={{ padding: '10px', background: 'rgba(11,33,25,0.02)', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '8px', color: 'rgba(11,33,25,0.4)', fontWeight: 700, display: 'block' }}>ENGINE MATCH SCORE</span>
                                        <strong style={{ fontSize: '13px', color: '#0B2119' }}>{reviewTarget.matchScore} / 100</strong>
                                      </div>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(11,33,25,0.08)', paddingTop: '16px', marginBottom: '20px' }}>
                                      <span style={{ fontSize: '8px', color: 'rgba(11,33,25,0.4)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>IMPACT AFTER ALLOCATION</span>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '11.5px', color: 'rgba(11,33,25,0.7)' }}>Remaining depot stock</span>
                                        <strong style={{ fontSize: '11.5px', color: remaining <= 0 ? '#C0392B' : '#2E7D32' }}>{remaining > 0 ? `${remaining.toLocaleString()} ${res.unit}` : 'DEPLETED'}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11.5px', color: 'rgba(11,33,25,0.7)' }}>Other demands affected</span>
                                        <strong style={{ fontSize: '11.5px', color: '#0B2119' }}>0</strong>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                      <button
                                        onClick={() => setShowReview(false)}
                                        style={{ flex: 1, padding: '11px', borderRadius: '4px', border: '1px solid rgba(11,33,25,0.15)', background: 'transparent', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        REJECT
                                      </button>
                                      <button
                                        onClick={() => { setShowReview(false); setShowConfirm(true); }}
                                        style={{ flex: 1, padding: '11px', borderRadius: '4px', border: 'none', background: '#0B2119', color: '#ffffff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        APPROVE ALLOCATION
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : matchOutput.bestMatch ? (
                              <div>
                                <RecommendationPanel
                                  bestMatch={matchOutput.bestMatch}
                                  demand={d}
                                  resourceMap={resourceMap}
                                  animateScore={animateScore}
                                  onAuthorize={() => setShowReview(true)}
                                  onAlternatives={() => setShowAlternatives(v => !v)}
                                />

                                {/* Alternatives comparison nested right below */}
                                {showAlternatives && matchOutput.results.length > 1 && (
                                  <div className={styles.compareSection} style={{ marginTop: '24px' }}>
                                    <div className={styles.compareTable}>
                                      <div className={styles.compareHead}>
                                        <span>RESOURCE</span><span>SCORE</span><span>STOCK</span><span>DISTANCE</span><span>STATUS</span>
                                      </div>
                                      {matchOutput.results.map(r => {
                                        const res = resourceMap.get(r.resourceId);
                                        if (!res) return null;
                                        const isBest = r.rank === 1;
                                        const isActiveCandidate = reviewTarget?.resourceId === res.id;
                                        return (
                                          <div
                                            key={r.resourceId}
                                            className={`${styles.compareRow} ${isBest ? styles.compareRowBest : ''} ${isActiveCandidate ? styles.compareRowActiveCandidate : ''}`}
                                            onClick={() => setReviewTarget(r)}
                                            style={{ cursor: 'pointer', borderLeft: isActiveCandidate ? '3px solid #E86F16' : undefined }}
                                          >
                                            <div className={styles.compareResName}>
                                              <span>{res.locationName.split(',')[0]}</span>
                                              <span className={styles.compareResType}>{res.name}</span>
                                            </div>
                                            <span style={{ color: QUALITY_CFG[r.qualityLabel]?.color, fontWeight: 700 }}>{r.matchScore}</span>
                                            <span>{res.quantity.toLocaleString()} {res.unit}</span>
                                            <span>{r.distanceKm} km</span>
                                            <span className={`${styles.compareStatus} ${res.status === 'AVAILABLE' ? styles.compareAvail : styles.compareLow}`}>{res.status}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={styles.noMatchPanel}>
                                <span>No suitable match found. Consider split allocation or escalation.</span>
                              </div>
                            )}

                            {/* Scoring Logic Explanation */}
                            <div className={styles.scoringLogicSection} style={{ marginTop: '24px' }}>
                              <button
                                className={styles.scoringLogicToggle}
                                onClick={() => setShowScoringLogic(v => !v)}
                              >
                                <Info size={11} />
                                HOW WAS THIS MATCH SCORED?
                                {showScoringLogic ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                              {showScoringLogic && (
                                <div className={styles.scoringLogicBody}>
                                  {[
                                    { label: 'Availability', weight: MATCH_WEIGHTS.availability },
                                    { label: 'Distance', weight: MATCH_WEIGHTS.distance },
                                    { label: 'Demand Priority', weight: MATCH_WEIGHTS.priority },
                                    { label: 'Compatibility', weight: MATCH_WEIGHTS.compatibility },
                                    { label: 'Allocation Pressure', weight: MATCH_WEIGHTS.allocationPressure },
                                  ].map(({ label, weight }) => (
                                    <ScoreBarRow key={label} label={label} value={weight} max={100} active={scoringActive} />
                                  ))}
                                  <p className={styles.scoringNote}>
                                    Weighted deterministic model. Weights are centralized constants, replaceable with ML-ranked scoring in future iterations.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Routing Map & Geographic Preview */}
                          {(() => {
                            const relatedIncident = incidents.find(
                              i => i.id === d.incidentId || (i as any).uuid === d.incidentId || i.id === (d as any).backendIncidentId || (i as any).uuid === (d as any).backendIncidentId
                            );
                            const mapResources = (() => {
                              if (!reviewTarget) return [];
                              const r = resourceMap.get(reviewTarget.resourceId);
                              return r ? [r] : [];
                            })();

                            return (
                              <div className={styles.mapSection} style={{ margin: 0, height: '100%' }}>
                                <span className={styles.mapEyebrow}>GEOGRAPHIC CONTEXT</span>
                                <div className={styles.mapContainer} style={{ height: '320px', borderRadius: '4px', overflow: 'hidden' }}>
                                  <MapView
                                    incidents={relatedIncident ? [relatedIncident] : []}
                                    resources={mapResources}
                                    vehicles={[]}
                                    shelters={[]}
                                    layerFilters={{
                                      incidents: !!relatedIncident,
                                      resources: true,
                                      vehicles: false,
                                      shelters: false,
                                      routes: false,
                                    }}
                                  />
                                </div>
                                <div className={styles.mapLegend} style={{ padding: '8px 4px' }}>
                                  {relatedIncident && <span><span className={styles.mapDot} style={{ background: '#C0392B' }} /> Demand location</span>}
                                  <span><span className={styles.mapDot} style={{ background: '#2E7D32' }} /> Resource depot</span>
                                  {reviewTarget && <span className={styles.mapDist}>{reviewTarget.distanceKm} km between sites</span>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(11, 33, 25, 0.45)' }}>
                          Click the request row to start AI-powered matching calculation.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Analyzing pulse ── */}
      {isAnalyzing && (
        <div className={styles.analyzingBar}>
          <div className={styles.analyzingPulse} />
          <span>ENGINE ANALYZING DEMAND → SCORING CANDIDATES</span>
        </div>
      )}




      <PageGuidebook guideKey="matching" />
    </div>
  );
};

export default DemandMatching;
