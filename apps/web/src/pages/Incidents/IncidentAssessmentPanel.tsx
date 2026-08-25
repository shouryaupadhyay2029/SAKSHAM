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
  HelpCircle, FileText, Shield, Send, ChevronDown,
  Phone, Mail, MessageSquare, Plus, Activity
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

  // Contact logs & verification states
  const [contactHistory, setContactHistory] = useState<any[]>([]);
  const [showCallForm, setShowCallForm] = useState(false);
  const [callOutcome, setCallOutcome] = useState<'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'INVALID_NUMBER'>('CONNECTED');
  const [callNote, setCallNote] = useState('');

  const [showSmsForm, setShowSmsForm] = useState(false);
  const [smsText, setSmsText] = useState('');

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailText, setEmailText] = useState('');

  // Field Verification states
  const [fieldVerifications, setFieldVerifications] = useState<any[]>([]);
  const [availableOfficers, setAvailableOfficers] = useState<any[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [showFieldVerificationRequest, setShowFieldVerificationRequest] = useState(false);
  const [fieldObservation, setFieldObservation] = useState('');
  const [fieldDecision, setFieldDecision] = useState<'CONFIRMED' | 'NOT_CONFIRMED' | 'INSUFFICIENT_INFORMATION'>('CONFIRMED');

  // Load state
  const [corroborationCount, setCorroborationCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAssessment, setSubmittedAssessment] = useState<any>(null);

  const incidentUuid = (incident as any).uuid || incident.id;

  // Role permissions check
  const isAuthorizedOfficer = authUser && ['OPERATOR', 'REGIONAL_AUTHORITY', 'ADMIN'].includes(authUser.role);

  // Masking functions
  const maskPhone = (phone?: string) => {
    if (!phone) return 'Phone unavailable';
    if (!isAuthorizedOfficer) return '+91 XXXXX XXXXX';
    return phone;
  };

  const maskEmail = (email?: string) => {
    if (!email) return 'Email unavailable';
    if (!isAuthorizedOfficer) return 'r***@example.com';
    return email;
  };

  const maskName = (name?: string) => {
    if (!name) return 'Civilian';
    if (!isAuthorizedOfficer) return name.split(' ')[0] + ' ***';
    return name;
  };

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

  const loadAssessmentData = async () => {
    try {
      // Load existing assessment if any
      const asmRes = await apiClient.getIncidentAssessments(incidentUuid);
      if (Array.isArray(asmRes.data) && asmRes.data.length > 0) {
        setSubmittedAssessment(asmRes.data[0]);
        setSubmitted(true);
      }

      // Load contact history
      const contactRes = await apiClient.getIncidentContacts(incidentUuid);
      if (Array.isArray(contactRes.data)) {
        setContactHistory(contactRes.data);
      }

      // Load field verifications
      const verRes = await apiClient.getFieldVerifications(incidentUuid);
      if (Array.isArray(verRes.data)) {
        setFieldVerifications(verRes.data);
      }

      // Load available officers
      const offRes = await apiClient.getAvailableOfficers();
      if (Array.isArray(offRes.data)) {
        setAvailableOfficers(offRes.data);
      }
    } catch {
      // Non-critical fallback
    }
  };

  useEffect(() => {
    loadAssessmentData();
  }, [incidentUuid]);

  // Handle contact log submission
  const handleSaveContactResult = async () => {
    try {
      await apiClient.createIncidentContact(incidentUuid, {
        method: 'PHONE',
        outcome: callOutcome,
        note: callNote,
      });
      setShowCallForm(false);
      setCallNote('');
      loadAssessmentData();
      if (callOutcome === 'CONNECTED') {
        setSelectedMethods(prev => prev.includes('REPORTER_CONTACTED') ? prev : [...prev, 'REPORTER_CONTACTED']);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save contact result.');
    }
  };

  // Handle SMS demo submit
  const handleSendSms = async () => {
    try {
      await apiClient.createIncidentContact(incidentUuid, {
        method: 'SMS',
        outcome: 'SENT',
        note: `Message: "${smsText}" (Demo mode - Twilio not configured)`,
      });
      setShowSmsForm(false);
      setSmsText('');
      loadAssessmentData();
      setSelectedMethods(prev => prev.includes('REPORTER_CONTACTED') ? prev : [...prev, 'REPORTER_CONTACTED']);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to send SMS.');
    }
  };

  // Handle Email demo submit
  const handleSendEmail = async () => {
    try {
      await apiClient.createIncidentContact(incidentUuid, {
        method: 'EMAIL',
        outcome: 'SENT',
        note: `Subject: "${emailSubject}" | Message: "${emailText}" (Demo mode - SendGrid not configured)`,
      });
      setShowEmailForm(false);
      setEmailSubject('');
      setEmailText('');
      loadAssessmentData();
      setSelectedMethods(prev => prev.includes('REPORTER_CONTACTED') ? prev : [...prev, 'REPORTER_CONTACTED']);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to send Email.');
    }
  };

  // Handle request field verification
  const handleRequestFieldVerification = async () => {
    if (!selectedOfficerId) return;
    try {
      await apiClient.createFieldVerification(incidentUuid, {
        assignedOfficerId: selectedOfficerId,
      });
      setShowFieldVerificationRequest(false);
      loadAssessmentData();
      setSelectedMethods(prev => prev.includes('FIELD_RESPONDER_INFO') ? prev : [...prev, 'FIELD_RESPONDER_INFO']);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to request field verification.');
    }
  };

  // Handle simulator update of field verification status
  const handleSimulateFieldStatus = async (verId: string, targetStatus: any) => {
    try {
      const payload: any = { status: targetStatus };
      if (targetStatus === 'COMPLETED') {
        payload.observation = fieldObservation;
        payload.decision = fieldDecision;
      }
      await apiClient.updateFieldVerification(verId, payload);
      loadAssessmentData();
      if (targetStatus === 'COMPLETED' && fieldDecision === 'CONFIRMED') {
        setSelectedMethods(prev => prev.includes('FIELD_RESPONDER_INFO') ? prev : [...prev, 'FIELD_RESPONDER_INFO']);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to simulate field status update.');
    }
  };

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

            {/* ── Section 1: Report Details & Reporter Info ── */}
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
                  <span className={styles.detailLabel}>Description</span>
                  <span className={styles.detailValue} style={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                    "{incident.description || 'No description provided.'}"
                  </span>
                </div>
              </div>

              {/* Reporter Information Card */}
              <div className={styles.reporterCard}>
                <div className={styles.reporterCardHeader}>
                  <User size={13} />
                  <span>REPORTER INFORMATION</span>
                </div>
                <div className={styles.reporterInfoGrid}>
                  <div className={styles.reporterInfoItem}>
                    <span className={styles.reporterInfoLabel}>NAME</span>
                    <span className={styles.reporterInfoValue}>{maskName(incident.reporterName)}</span>
                  </div>
                  <div className={styles.reporterInfoItem}>
                    <span className={styles.reporterInfoLabel}>PHONE</span>
                    <span className={styles.reporterInfoValue}>{maskPhone((incident as any).reporterPhone || (incident as any).reporterContact)}</span>
                  </div>
                  <div className={styles.reporterInfoItem}>
                    <span className={styles.reporterInfoLabel}>EMAIL</span>
                    <span className={styles.reporterInfoValue}>{maskEmail((incident as any).reporterEmail)}</span>
                  </div>
                  <div className={styles.reporterInfoItem}>
                    <span className={styles.reporterInfoLabel}>CONTACT ATTEMPTS</span>
                    <span className={styles.reporterInfoValue}>
                      {contactHistory.length > 0 ? `${contactHistory.length} attempts logged` : 'Not Contacted'}
                    </span>
                  </div>
                </div>

                {isAuthorizedOfficer && ((incident as any).reporterPhone || (incident as any).reporterContact) && (
                  <div className={styles.commActionButtons}>
                    <a
                      href={`tel:${(incident as any).reporterPhone || (incident as any).reporterContact}`}
                      className={styles.commBtn}
                      onClick={() => setShowCallForm(true)}
                    >
                      <Phone size={13} />
                      CALL REPORTER
                    </a>
                    <button className={styles.commBtn} onClick={() => setShowSmsForm(true)}>
                      <MessageSquare size={13} />
                      SEND SMS
                    </button>
                    <button className={styles.commBtn} onClick={() => setShowEmailForm(true)}>
                      <Mail size={13} />
                      SEND EMAIL
                    </button>
                  </div>
                )}

                {/* Sub-form: Phone call outcome tracker */}
                {showCallForm && (
                  <div className={styles.subForm}>
                    <h4>RECORD CALL OUTCOME</h4>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Outcome</label>
                      <div className={styles.outcomeOptions}>
                        {['CONNECTED', 'NO_ANSWER', 'BUSY', 'INVALID_NUMBER'].map(o => (
                          <label key={o} className={styles.outcomeLabel}>
                            <input
                              type="radio"
                              name="callOutcome"
                              checked={callOutcome === o}
                              onChange={() => setCallOutcome(o as any)}
                            />
                            <span>{o.replace('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Call Note</label>
                      <input
                        type="text"
                        className={styles.textInput}
                        placeholder="Reporter statement or call details..."
                        value={callNote}
                        onChange={e => setCallNote(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFormActions}>
                      <button className={styles.subFormSaveBtn} onClick={handleSaveContactResult}>
                        SAVE CONTACT RESULT
                      </button>
                      <button className={styles.subFormCancelBtn} onClick={() => setShowCallForm(false)}>
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-form: SMS sender */}
                {showSmsForm && (
                  <div className={styles.subForm}>
                    <h4>SEND SMS (DEMO MODE)</h4>
                    <p className={styles.subFormHint}>SMS service not configured (abstractions logs only)</p>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>SMS Message</label>
                      <textarea
                        className={styles.textarea}
                        rows={2}
                        placeholder="Type SMS content here..."
                        value={smsText}
                        onChange={e => setSmsText(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFormActions}>
                      <button className={styles.subFormSaveBtn} onClick={handleSendSms} disabled={!smsText.trim()}>
                        SEND SMS
                      </button>
                      <button className={styles.subFormCancelBtn} onClick={() => setShowSmsForm(false)}>
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-form: Email sender */}
                {showEmailForm && (
                  <div className={styles.subForm}>
                    <h4>SEND EMAIL (DEMO MODE)</h4>
                    <p className={styles.subFormHint}>Email service not configured (abstractions logs only)</p>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Subject</label>
                      <input
                        type="text"
                        className={styles.textInput}
                        placeholder="SAKSHAM — Incident Alert"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email Message</label>
                      <textarea
                        className={styles.textarea}
                        rows={3}
                        placeholder="Type email content here..."
                        value={emailText}
                        onChange={e => setEmailText(e.target.value)}
                      />
                    </div>
                    <div className={styles.subFormActions}>
                      <button className={styles.subFormSaveBtn} onClick={handleSendEmail} disabled={!emailText.trim()}>
                        SEND EMAIL
                      </button>
                      <button className={styles.subFormCancelBtn} onClick={() => setShowEmailForm(false)}>
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className={styles.divider} />

            {/* ── Section 2: Contact History Log ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MessageSquare size={14} />
                CONTACT HISTORY
              </h2>
              <div className={styles.contactHistoryFeed}>
                {contactHistory.length > 0 ? (
                  contactHistory.map((log, idx) => (
                    <div key={log.id || idx} className={styles.contactLogItem}>
                      <div className={styles.contactLogMeta}>
                        <span className={styles.contactLogTime}>
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                        <span className={styles.contactLogMethod}>
                          {log.method === 'PHONE' ? '📞 Call attempted' : log.method === 'SMS' ? '✉ SMS logged' : '✉ Email logged'}
                        </span>
                        <span className={styles.contactLogOfficer}>
                          Officer: {log.officer?.name || 'Officer'}
                        </span>
                      </div>
                      <div className={styles.contactLogContent}>
                        <p className={styles.contactLogNote}>Outcome: <strong>{log.outcome.replace('_', ' ')}</strong></p>
                        {log.note && <p className={styles.contactLogDesc}>📝 "{log.note}"</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyFeed}>No contact attempts recorded.</p>
                )}
              </div>
            </section>

            <div className={styles.divider} />

            {/* ── Section 3: Field Verification Workflow ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Activity size={14} />
                FIELD VERIFICATION
              </h2>

              {fieldVerifications.length > 0 ? (
                fieldVerifications.map((ver, idx) => (
                  <div key={ver.id || idx} className={styles.verificationProgressCard}>
                    <div className={styles.verificationProgressHeader}>
                      <span>Task: FIELD_VERIFICATION</span>
                      <span className={styles.verStatusBadge}>{ver.status}</span>
                    </div>
                    <div className={styles.verificationProgressBody}>
                      <p><strong>Assigned Officer:</strong> {ver.assignedOfficer?.name || 'Field Officer'}</p>
                      <p><strong>Requested By:</strong> {ver.requestedByOfficer?.name || 'Command Officer'}</p>
                      {ver.status === 'COMPLETED' && (
                        <div className={styles.observationBlock}>
                          <p><strong>Decision:</strong> <span style={{ color: ver.decision === 'CONFIRMED' ? '#10B981' : '#EF4444' }}>{ver.decision}</span></p>
                          <p><strong>Observation:</strong> "{ver.observation || 'No details provided'}"</p>
                        </div>
                      )}
                    </div>

                    {/* Field Officer Simulation controls */}
                    {ver.status !== 'COMPLETED' && ver.status !== 'CANCELLED' && (
                      <div className={styles.simulatorControls}>
                        <h5>FIELD OFFICER SIMULATION CONTROL</h5>
                        <div className={styles.simulatorButtons}>
                          {ver.status === 'ASSIGNED' && (
                            <button
                              className={styles.simBtn}
                              onClick={() => handleSimulateFieldStatus(ver.id, 'EN_ROUTE')}
                            >
                              START TRAVEL (EN ROUTE)
                            </button>
                          )}
                          {ver.status === 'EN_ROUTE' && (
                            <button
                              className={styles.simBtn}
                              onClick={() => handleSimulateFieldStatus(ver.id, 'ARRIVED')}
                            >
                              MARK ARRIVED
                            </button>
                          )}
                          {ver.status === 'ARRIVED' && (
                            <div className={styles.observationInputBlock}>
                              <textarea
                                className={styles.textarea}
                                rows={2}
                                placeholder="Enter actual field observation..."
                                value={fieldObservation}
                                onChange={e => setFieldObservation(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                <select
                                  className={styles.select}
                                  value={fieldDecision}
                                  onChange={e => setFieldDecision(e.target.value as any)}
                                >
                                  <option value="CONFIRMED">INCIDENT CONFIRMED</option>
                                  <option value="NOT_CONFIRMED">INCIDENT NOT CONFIRMED</option>
                                  <option value="INSUFFICIENT_INFORMATION">INSUFFICIENT INFORMATION</option>
                                </select>
                                <button
                                  className={styles.simBtn}
                                  style={{ backgroundColor: '#059669', color: '#fff' }}
                                  disabled={!fieldObservation.trim()}
                                  onClick={() => handleSimulateFieldStatus(ver.id, 'COMPLETED')}
                                >
                                  SUBMIT OBSERVATION
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ marginBottom: '14px' }}>
                  <p className={styles.emptyFeed}>No field verification requested.</p>
                  {isAuthorizedOfficer && (
                    <button
                      className={styles.requestFieldBtn}
                      onClick={() => setShowFieldVerificationRequest(!showFieldVerificationRequest)}
                    >
                      <Plus size={13} />
                      REQUEST FIELD VERIFICATION
                    </button>
                  )}
                </div>
              )}

              {showFieldVerificationRequest && (
                <div className={styles.subForm}>
                  <h4>ASSIGN FIELD OFFICER</h4>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Available Personnel</label>
                    {availableOfficers.length > 0 ? (
                      <div className={styles.selectWrapper}>
                        <select
                          className={styles.select}
                          value={selectedOfficerId}
                          onChange={e => setSelectedOfficerId(e.target.value)}
                        >
                          <option value="">— Select Officer —</option>
                          {availableOfficers.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.role}) &middot; MAPPED
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className={styles.selectIcon} />
                      </div>
                    ) : (
                      <p className={styles.subFormHint}>No available field officers.</p>
                    )}
                  </div>
                  <div className={styles.subFormActions}>
                    <button
                      className={styles.subFormSaveBtn}
                      disabled={!selectedOfficerId}
                      onClick={handleRequestFieldVerification}
                    >
                      ASSIGN FIELD OFFICER
                    </button>
                    <button className={styles.subFormCancelBtn} onClick={() => setShowFieldVerificationRequest(false)}>
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className={styles.divider} />

            {/* ── Section 4: Verification Checklist Summary ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Shield size={14} />
                VERIFICATION SUMMARY
              </h2>
              <div className={styles.verificationSummaryTable}>
                <div className={styles.summaryRow}>
                  <span>Reporter contacted</span>
                  <span>{contactHistory.some(c => c.outcome === 'CONNECTED') ? '✓ Connected' : '✕ No phone verification'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Location reviewed</span>
                  <span>{hasLocation ? '✓ Reviewed' : '✕ Unavailable'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Evidence reviewed</span>
                  <span>✕ No evidence submitted</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Corroborating reports</span>
                  <span>{corroborationCount !== null ? `✓ ${corroborationCount} report(s) nearby` : '✕ None'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Field verification</span>
                  <span>
                    {fieldVerifications.some(f => f.status === 'COMPLETED' && f.decision === 'CONFIRMED')
                      ? '✓ Confirmed'
                      : fieldVerifications.length > 0
                        ? `⚠ Pending (${fieldVerifications[0].status})`
                        : '✕ Not requested'}
                  </span>
                </div>
              </div>
            </section>

            <div className={styles.divider} />

            {/* ── Section 5: Decision ── */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <AlertTriangle size={14} />
                ASSESSMENT DECISION
              </h2>
              <p className={styles.sectionNote}>
                Select your final decision. This action will be permanently recorded in the incident audit log.
                It cannot be undone.
              </p>

              {/* Assessment note */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="assessment-note">
                  Officer Assessment Note <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  id="assessment-note"
                  className={styles.textarea}
                  rows={3}
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
                      onClick={() => setPriorityAssessment(priorityAssessment === opt.value ? null : (opt.value as any))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

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
