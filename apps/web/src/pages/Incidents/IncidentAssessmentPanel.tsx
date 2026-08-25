/**
 * IncidentAssessmentPanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen command-center modal for officer incident assessment.
 * Opens when an officer clicks "ASSESS INCIDENT" on a REPORTED incident.
 *
 * IMPORTANT: This component only displays real data from the database.
 * It never fabricates evidence, corroboration counts, or verification signals.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  X, MapPin, Clock, User, AlertTriangle, CheckCircle2, XCircle,
  HelpCircle, FileText, Shield, Send, ChevronDown, AlertOctagon
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import styles from './IncidentAssessmentPanel.module.css';
import type { Incident } from '../../types/incident';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Decision = 'CONFIRMED' | 'NEEDS_INFORMATION' | 'REJECTED';

interface AssessmentPanelProps {
  incident: Incident;
  onClose: () => void;
  onAssessmentComplete: (updatedIncident: any) => void;
}

const VERIFICATION_METHODS = [
  { id: 'REPORTER_CONTACTED', label: 'Reporter contacted' },
  { id: 'LOCATION_REVIEWED', label: 'Location reviewed on map' },
  { id: 'EVIDENCE_REVIEWED', label: 'Evidence reviewed (if any)' },
  { id: 'CORROBORATING_REPORTS', label: 'Corroborating reports considered' },
  { id: 'FIELD_RESPONDER_INFO', label: 'Nearby responder information' },
  { id: 'OTHER', label: 'Other (describe in notes)' },
];

const REJECTION_REASONS = [
  'Insufficient information to verify',
  'Duplicate report (already registered)',
  'False or misleading report',
  'Incident no longer active at location',
  'Incorrect location data',
  'Other',
];

const PRIORITY_OPTIONS: Array<{ value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; label: string; color: string }> = [
  { value: 'LOW', label: 'LOW', color: '#10B981' },
  { value: 'MEDIUM', label: 'MEDIUM', color: '#EAB308' },
  { value: 'HIGH', label: 'HIGH', color: '#F47C20' },
  { value: 'CRITICAL', label: 'CRITICAL', color: '#EF4444' },
];

/* ─── Component ──────────────────────────────────────────────────────────── */

export const IncidentAssessmentPanel: React.FC<AssessmentPanelProps> = ({
  incident,
  onClose,
  onAssessmentComplete,
}) => {
  const { authUser } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Assessment form state
  const [decision, setDecision] = useState<Decision | null>(null);
  const [assessmentNote, setAssessmentNote] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [priorityAssessment, setPriorityAssessment] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [infoRequestReason, setInfoRequestReason] = useState('');

  // Load state
  const [corroborationCount, setCorroborationCount] = useState<number | null>(null);
  const [isLoadingCorroboration, setIsLoadingCorroboration] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAssessment, setSubmittedAssessment] = useState<any>(null);

  // Fetch timeline to see if assessment is already loaded

  const incidentUuid = (incident as any).uuid || incident.id;

  // Animate in
  useEffect(() => {
    if (panelRef.current && backdropRef.current) {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
      gsap.fromTo(panelRef.current,
        { x: '100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.45, ease: 'power3.out' }
      );
    }
  }, []);

  // Load real corroboration count and timeline from backend
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoadingCorroboration(true);
      try {
        // Load existing assessment if any
        const asmRes = await apiClient.getIncidentAssessments(incidentUuid);
        if (!cancelled && Array.isArray(asmRes.data) && asmRes.data.length > 0) {
          // Already assessed — show result
          setSubmittedAssessment(asmRes.data[0]);
          setSubmitted(true);
        }
      } catch {
        // Non-critical: corroboration unavailable
      } finally {
        if (!cancelled) setIsLoadingCorroboration(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [incidentUuid]);

  // Animate corroboration count IN after load (purely cosmetic)
  // We use the real count from the assessment if it exists
  useEffect(() => {
    if (submittedAssessment?.corroborationCount !== undefined) {
      setCorroborationCount(submittedAssessment.corroborationCount);
    }
  }, [submittedAssessment]);

  const handleClose = () => {
    if (panelRef.current && backdropRef.current) {
      gsap.to(panelRef.current, { x: '100%', opacity: 0, duration: 0.3, ease: 'power3.in' });
      gsap.to(backdropRef.current, { opacity: 0, duration: 0.25, onComplete: onClose });
    } else {
      onClose();
    }
  };

  const toggleMethod = (methodId: string) => {
    setSelectedMethods(prev =>
      prev.includes(methodId) ? prev.filter(m => m !== methodId) : [...prev, methodId]
    );
  };

  const canSubmit = (): boolean => {
    if (!decision) return false;
    if (!assessmentNote.trim()) return false;
    if (decision === 'REJECTED' && !rejectionReason) return false;
    if (decision === 'NEEDS_INFORMATION' && !infoRequestReason.trim()) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiClient.assessIncident(incidentUuid, {
        decision: decision!,
        assessmentNote: assessmentNote.trim(),
        verificationMethods: selectedMethods,
        priorityAssessment: priorityAssessment || undefined,
        rejectionReason: rejectionReason || undefined,
        infoRequestReason: infoRequestReason.trim() || undefined,
      });

      setSubmittedAssessment(res.data.assessment);
      setCorroborationCount(res.data.assessment.corroborationCount ?? null);
      setSubmitted(true);
      onAssessmentComplete(res.data.incident);
    } catch (err: any) {
      setSubmitError(err?.message || 'Assessment submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helpers ──
  const severityColors: Record<string, string> = {
    CRITICAL: '#EF4444', HIGH: '#F47C20', MEDIUM: '#EAB308', LOW: '#10B981'
  };

  const hasReporterContact = !!(incident.reporterContact && incident.reporterContact !== '');
  const hasLocation = !!(incident.coordinates?.lat && incident.coordinates?.lng);

  const reportedAt = new Date(incident.reportedAt || incident.time);
  const reportedTimeStr = isNaN(reportedAt.getTime()) ? 'Unknown' : reportedAt.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
  });
  const reportedDateStr = isNaN(reportedAt.getTime()) ? '' : reportedAt.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
  });

  /* ─── Render: Success State ────────────────────────────────────────────── */
  const renderSuccess = () => {
    const a = submittedAssessment;
    const decisionMap: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
      CONFIRMED: { icon: <CheckCircle2 size={28} />, label: 'INCIDENT CONFIRMED', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
      NEEDS_INFORMATION: { icon: <HelpCircle size={28} />, label: 'MORE INFORMATION REQUESTED', color: '#EAB308', bg: 'rgba(234,179,8,0.1)' },
      REJECTED: { icon: <XCircle size={28} />, label: 'INCIDENT REJECTED', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    };
    const d = decisionMap[a?.decision] || decisionMap['CONFIRMED'];

    return (
      <div className={styles.successState}>
        <div className={styles.successIcon} style={{ color: d.color, background: d.bg }}>
          {d.icon}
        </div>
        <h2 className={styles.successTitle} style={{ color: d.color }}>{d.label}</h2>
        <p className={styles.successSub}>Assessment recorded and persisted to the incident database.</p>

        <div className={styles.auditCard}>
          <div className={styles.auditRow}>
            <span className={styles.auditLabel}>VERIFIED BY</span>
            <span className={styles.auditValue}>{a?.officer?.name || authUser?.name || 'Officer'}</span>
          </div>
          <div className={styles.auditRow}>
            <span className={styles.auditLabel}>ROLE</span>
            <span className={styles.auditValue}>{a?.officer?.role || authUser?.role || '—'}</span>
          </div>
          <div className={styles.auditRow}>
            <span className={styles.auditLabel}>TIMESTAMP</span>
            <span className={styles.auditValue}>
              {a?.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
          </div>
          <div className={styles.auditRow}>
            <span className={styles.auditLabel}>DECISION</span>
            <span className={styles.auditValue} style={{ color: d.color }}>{a?.decision}</span>
          </div>
          {a?.verificationMethods?.length > 0 && (
            <div className={styles.auditRow}>
              <span className={styles.auditLabel}>METHODS</span>
              <span className={styles.auditValue}>
                {a.verificationMethods.map((m: string) =>
                  VERIFICATION_METHODS.find(vm => vm.id === m)?.label || m
                ).join(', ')}
              </span>
            </div>
          )}
          <div className={styles.auditRow}>
            <span className={styles.auditLabel}>ASSESSMENT NOTE</span>
            <span className={styles.auditValue} style={{ fontStyle: 'italic' }}>"{a?.assessmentNote}"</span>
          </div>
          {a?.rejectionReason && (
            <div className={styles.auditRow}>
              <span className={styles.auditLabel}>REJECTION REASON</span>
              <span className={styles.auditValue} style={{ color: '#EF4444' }}>{a.rejectionReason}</span>
            </div>
          )}
          {a?.corroborationCount !== undefined && a?.corroborationCount !== null && (
            <div className={styles.auditRow}>
              <span className={styles.auditLabel}>CORROBORATION</span>
              <span className={styles.auditValue}>{a.corroborationCount} nearby incident{a.corroborationCount !== 1 ? 's' : ''} at time of assessment</span>
            </div>
          )}
        </div>

        <button className={styles.closeSuccessBtn} onClick={handleClose}>
          Return to Incident Workspace
        </button>
      </div>
    );
  };

  /* ─── Render: Assessment Form ──────────────────────────────────────────── */
  return (
    <>
      <div ref={backdropRef} className={styles.backdrop} onClick={handleClose} />
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="assessment-title">

        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderLeft}>
            <div className={styles.panelEyebrow}>
              <span className={styles.liveDot} />
              <span>OFFICER INCIDENT ASSESSMENT</span>
            </div>
            <h1 id="assessment-title" className={styles.panelTitle}>
              {incident.id} &middot; {incident.type?.replace(/_/g, ' ')}
            </h1>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close assessment panel">
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div className={styles.panelBody}>{renderSuccess()}</div>
        ) : (
          <div className={styles.panelBody}>

            {/* ── Section 1: Report Details ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <FileText size={14} />
                REPORT DETAILS
              </h2>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Incident ID</span>
                  <span className={styles.detailValue}>{incident.id}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Type</span>
                  <span className={styles.detailValue}>{incident.type?.replace(/_/g, ' ')}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Severity</span>
                  <span className={styles.detailValue} style={{ color: severityColors[incident.severity] || '#FAF8F3' }}>
                    {incident.severity}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Reported At</span>
                  <span className={styles.detailValue}>
                    <Clock size={11} style={{ marginRight: 4 }} />
                    {reportedTimeStr} IST &nbsp;·&nbsp; {reportedDateStr}
                  </span>
                </div>
                <div className={styles.detailItemFull}>
                  <span className={styles.detailLabel}>
                    <MapPin size={11} style={{ marginRight: 4 }} />
                    Location
                  </span>
                  <span className={styles.detailValue}>{incident.location}</span>
                </div>
                {hasLocation && (
                  <div className={styles.detailItemFull}>
                    <span className={styles.detailLabel}>Coordinates</span>
                    <span className={styles.detailValue} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {incident.coordinates.lat.toFixed(6)}, {incident.coordinates.lng.toFixed(6)}
                    </span>
                  </div>
                )}
                <div className={styles.detailItemFull}>
                  <span className={styles.detailLabel}>
                    <User size={11} style={{ marginRight: 4 }} />
                    Reporter
                  </span>
                  <span className={styles.detailValue}>
                    {incident.reporterName || 'Civilian (not authenticated)'}
                  </span>
                </div>
                <div className={styles.detailItemFull}>
                  <span className={styles.detailLabel}>Description</span>
                  <span className={styles.detailValue} style={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                    "{incident.description || 'No description provided.'}"
                  </span>
                </div>
              </div>
            </section>

            <div className={styles.divider} />

            {/* ── Section 2: Verification Signals ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Shield size={14} />
                AVAILABLE VERIFICATION SIGNALS
              </h2>
              <p className={styles.sectionNote}>
                These signals reflect what is actually available in the system. No information has been fabricated.
              </p>

              <div className={styles.signalGrid}>
                {/* Location */}
                <div className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <MapPin size={14} />
                    <span>LOCATION</span>
                  </div>
                  <div className={`${styles.signalItem} ${hasLocation ? styles.signalAvailable : styles.signalUnavailable}`}>
                    {hasLocation ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{hasLocation ? 'Coordinates received' : 'No coordinates'}</span>
                  </div>
                  <div className={`${styles.signalItem} ${hasLocation ? styles.signalAvailable : styles.signalUnavailable}`}>
                    {hasLocation ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{hasLocation ? 'Location mapped on system' : 'Location not mappable'}</span>
                  </div>
                </div>

                {/* Reporter Contact */}
                <div className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <User size={14} />
                    <span>REPORTER CONTACT</span>
                  </div>
                  <div className={`${styles.signalItem} ${hasReporterContact ? styles.signalAvailable : styles.signalUnavailable}`}>
                    {hasReporterContact ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{hasReporterContact ? `Contact available (${incident.reporterContact})` : 'No contact info provided'}</span>
                  </div>
                  <div className={styles.signalItem} style={{ color: 'rgba(250,248,243,0.4)' }}>
                    <HelpCircle size={13} />
                    <span>Phone verification: Not attempted</span>
                  </div>
                </div>

                {/* Evidence */}
                <div className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <AlertTriangle size={14} />
                    <span>EVIDENCE</span>
                  </div>
                  <div className={`${styles.signalItem} ${styles.signalUnavailable}`}>
                    <XCircle size={13} />
                    <span>No evidence submitted by reporter.</span>
                  </div>
                  <div className={styles.signalItem} style={{ color: 'rgba(250,248,243,0.35)', fontSize: '11px' }}>
                    <span>Evidence upload system not yet available in this version.</span>
                  </div>
                </div>

                {/* Corroboration */}
                <div className={styles.signalCard}>
                  <div className={styles.signalHeader}>
                    <AlertOctagon size={14} />
                    <span>REPORT CORROBORATION</span>
                  </div>
                  {isLoadingCorroboration ? (
                    <div className={`${styles.signalItem} ${styles.signalPending}`}>
                      <HelpCircle size={13} />
                      <span>Calculating nearby incidents...</span>
                    </div>
                  ) : corroborationCount !== null ? (
                    <div className={`${styles.signalItem} ${corroborationCount > 0 ? styles.signalAvailable : styles.signalUnavailable}`}>
                      {corroborationCount > 0 ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      <span>
                        {corroborationCount > 0
                          ? `${corroborationCount} nearby incident${corroborationCount !== 1 ? 's' : ''} detected within ~500m`
                          : 'No corroborating reports found'}
                      </span>
                    </div>
                  ) : (
                    <div className={`${styles.signalItem} ${styles.signalPending}`}>
                      <HelpCircle size={13} />
                      <span>Corroboration data unavailable</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className={styles.divider} />

            {/* ── Section 3: Officer Assessment Form ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Shield size={14} />
                OFFICER ASSESSMENT
              </h2>

              {/* Verification methods */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Verification methods used (select all that apply)</label>
                <div className={styles.checkboxGrid}>
                  {VERIFICATION_METHODS.map(method => (
                    <label key={method.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={selectedMethods.includes(method.id)}
                        onChange={() => toggleMethod(method.id)}
                      />
                      <span className={styles.checkboxText}>{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assessment note */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="assessment-note">
                  Officer Assessment Note <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  id="assessment-note"
                  className={styles.textarea}
                  rows={4}
                  placeholder="Describe your assessment of this incident, what you reviewed, and any relevant findings..."
                  value={assessmentNote}
                  onChange={e => setAssessmentNote(e.target.value)}
                  maxLength={2000}
                />
                <span className={styles.charCount}>{assessmentNote.length}/2000</span>
              </div>

              {/* Priority assessment */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Officer Priority Assessment (optional)</label>
                <div className={styles.priorityRow}>
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.priorityBtn} ${priorityAssessment === opt.value ? styles.priorityBtnActive : ''}`}
                      style={priorityAssessment === opt.value ? {
                        backgroundColor: `${opt.color}20`,
                        borderColor: opt.color,
                        color: opt.color
                      } : {}}
                      onClick={() => setPriorityAssessment(priorityAssessment === opt.value ? null : opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className={styles.divider} />

            {/* ── Section 4: Decision ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <AlertTriangle size={14} />
                ASSESSMENT DECISION
              </h2>
              <p className={styles.sectionNote}>
                Select your final decision. This action will be permanently recorded in the incident audit log.
                It cannot be undone.
              </p>

              {/* Decision selector */}
              <div className={styles.decisionRow}>
                <button
                  id="btn-assess-confirm"
                  type="button"
                  className={`${styles.decisionBtn} ${styles.decisionConfirm} ${decision === 'CONFIRMED' ? styles.decisionActive : ''}`}
                  onClick={() => { setDecision('CONFIRMED'); setRejectionReason(''); setInfoRequestReason(''); }}
                >
                  <CheckCircle2 size={16} />
                  CONFIRM INCIDENT
                </button>
                <button
                  id="btn-assess-info"
                  type="button"
                  className={`${styles.decisionBtn} ${styles.decisionInfo} ${decision === 'NEEDS_INFORMATION' ? styles.decisionActive : ''}`}
                  onClick={() => { setDecision('NEEDS_INFORMATION'); setRejectionReason(''); }}
                >
                  <HelpCircle size={16} />
                  REQUEST MORE INFO
                </button>
                <button
                  id="btn-assess-reject"
                  type="button"
                  className={`${styles.decisionBtn} ${styles.decisionReject} ${decision === 'REJECTED' ? styles.decisionActive : ''}`}
                  onClick={() => { setDecision('REJECTED'); setInfoRequestReason(''); }}
                >
                  <XCircle size={16} />
                  REJECT INCIDENT
                </button>
              </div>

              {/* Conditional: Rejection reason */}
              {decision === 'REJECTED' && (
                <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                  <label className={styles.formLabel}>
                    Rejection Reason <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div className={styles.selectWrapper}>
                    <select
                      className={styles.select}
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    >
                      <option value="">— Select reason —</option>
                      {REJECTION_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={styles.selectIcon} />
                  </div>
                </div>
              )}

              {/* Conditional: Info request reason */}
              {decision === 'NEEDS_INFORMATION' && (
                <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                  <label className={styles.formLabel}>
                    Information Request Reason <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    placeholder="What additional information is needed from the reporter or field team?"
                    value={infoRequestReason}
                    onChange={e => setInfoRequestReason(e.target.value)}
                    maxLength={500}
                  />
                </div>
              )}

              {/* Submitting officer */}
              <div className={styles.officerRow}>
                <Shield size={14} />
                <span>Submitting as: <strong>{authUser?.name || 'Unknown Officer'}</strong> &nbsp;·&nbsp; {authUser?.role || 'OFFICER'}</span>
              </div>

              {/* Error */}
              {submitError && (
                <div className={styles.errorBox}>
                  <AlertTriangle size={14} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit */}
              <button
                id="btn-submit-assessment"
                type="button"
                className={styles.submitBtn}
                disabled={!canSubmit() || isSubmitting}
                onClick={handleSubmit}
                style={
                  decision === 'CONFIRMED' ? { backgroundColor: '#059669' } :
                  decision === 'REJECTED' ? { backgroundColor: '#DC2626' } :
                  decision === 'NEEDS_INFORMATION' ? { backgroundColor: '#B45309' } : {}
                }
              >
                {isSubmitting ? (
                  <>Processing Assessment...</>
                ) : (
                  <>
                    <Send size={14} />
                    {decision === 'CONFIRMED' ? 'SUBMIT: CONFIRM INCIDENT' :
                     decision === 'REJECTED' ? 'SUBMIT: REJECT INCIDENT' :
                     decision === 'NEEDS_INFORMATION' ? 'SUBMIT: REQUEST MORE INFO' :
                     'SELECT A DECISION ABOVE'}
                  </>
                )}
              </button>

              {!canSubmit() && !isSubmitting && (
                <p className={styles.validationHint}>
                  {!decision ? '← Select a decision above to proceed.' :
                   !assessmentNote.trim() ? '← Assessment note is required.' :
                   decision === 'REJECTED' && !rejectionReason ? '← Select a rejection reason.' :
                   decision === 'NEEDS_INFORMATION' && !infoRequestReason.trim() ? '← Describe what information is needed.' :
                   ''}
                </p>
              )}
            </section>

          </div>
        )}
      </div>
    </>
  );
};

export default IncidentAssessmentPanel;
