import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/db.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Severity, IncidentStatus, DemandPriority, DemandStatus, ResourceStatus, VehicleStatus, ShelterStatus, DispatchStatus, AllocationStatus, DeliveryStatus } from '@prisma/client';

const router = Router();

// Helper to wrap async route handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// ─── JWT Auth Middleware ──────────────────────────────────────────────────────
// Verifies the Bearer token in the Authorization header, looks up the Officer
// in the database, and attaches the officer record to req.officer.
// Returns 401 if no/invalid token, 403 if the Officer record doesn't exist.
const JWT_SECRET = process.env.JWT_SECRET || 'saksham-jwt-secret-2026';

async function requireOfficerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authorization token is required for this operation.' }
    });
    return;
  }

  const token = authHeader.slice(7);

  // Handle demo tokens (used in offline/fallback mode)
  const isDemoToken = token.startsWith('demo-token-');
  if (isDemoToken) {
    const roleFromToken = token.replace('demo-token-', '').toUpperCase();
    // Demo tokens are only valid for officer roles
    if (roleFromToken === 'CIVILIAN') {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only officers can perform incident assessments.' }
      });
      return;
    }
    // Map to first officer in DB for demo purposes
    const demoOfficer = await prisma.officer.findFirst();
    if (!demoOfficer) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'No officer accounts found in the system.' }
      });
      return;
    }
    (req as any).officer = demoOfficer;
    next();
    return;
  }

  // Verify real JWT
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.status(401).json({
      error: { code: 'TOKEN_INVALID', message: 'Authorization token is invalid or expired.' }
    });
    return;
  }

  const officerId = payload.sub || payload.id || payload.officerId;
  if (!officerId) {
    res.status(401).json({
      error: { code: 'TOKEN_INVALID', message: 'Token payload is missing officer identifier.' }
    });
    return;
  }

  const officer = await prisma.officer.findUnique({ where: { id: officerId } });
  if (!officer) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Officer account not found or has been deactivated.' }
    });
    return;
  }

  (req as any).officer = officer;
  next();
}

/* ==========================================
   INCIDENT ROUTING & SCHEMAS
   ========================================== */

const incidentCreateSchema = z.object({
  type: z.string().min(1, 'Incident type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  latitude: z.number(),
  longitude: z.number(),
  region: z.string().min(1, 'Region is required'),
  severity: z.nativeEnum(Severity),
  status: z.nativeEnum(IncidentStatus).optional(),
  affectedPeople: z.number().int().nonnegative().optional(),
  displacedPeople: z.number().int().nonnegative().optional(),
  assignedUnit: z.string().optional(),
  reporterName: z.string().optional(),
  reporterPhone: z.string().optional(),
  reporterEmail: z.string().optional(),
});

const incidentUpdateSchema = incidentCreateSchema.partial();

const incidentStatusSchema = z.object({
  status: z.nativeEnum(IncidentStatus),
});

async function isOfficerUser(req: Request): Promise<boolean> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.slice(7);
  if (token.startsWith('demo-token-')) {
    const role = token.replace('demo-token-', '').toUpperCase();
    return role !== 'CIVILIAN';
  }
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    const officerId = payload.sub || payload.id || payload.officerId;
    if (!officerId) return false;
    const officer = await prisma.officer.findUnique({ where: { id: officerId } });
    return !!officer;
  } catch {
    return false;
  }
}

function maskIncidentContacts(incident: any, isOfficer: boolean) {
  if (isOfficer) return incident;
  return {
    ...incident,
    reporterPhone: incident.reporterPhone ? '+91 XXXXX XXXXX' : 'Phone unavailable',
    reporterEmail: incident.reporterEmail ? 'r***@example.com' : 'Email unavailable',
    reporterName: incident.reporterName ? (incident.reporterName.split(' ')[0] + ' ***') : 'Civilian (unauthenticated)',
  };
}

// GET /api/incidents (with filter & search)
router.get('/incidents', asyncHandler(async (req, res) => {
  const { status, severity, search, region, limit = '50', offset = '0' } = req.query;
  const isOfficer = await isOfficerUser(req);

  const where: any = {};

  if (status) {
    where.status = status as IncidentStatus;
  }
  if (severity) {
    where.severity = severity as Severity;
  }
  if (region) {
    where.region = region as string;
  }
  if (search) {
    where.OR = [
      { incidentId: { contains: search as string, mode: 'insensitive' } },
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { location: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { reportedAt: 'desc' },
      include: {
        demands: true,
      },
    }),
    prisma.incident.count({ where }),
  ]);

  const maskedIncidents = incidents.map(inc => maskIncidentContacts(inc, isOfficer));

  res.json({
    data: maskedIncidents,
    meta: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  });
}));

// GET /api/incidents/:id (Can be UUID or human-readable incidentId)
router.get('/incidents/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isOfficer = await isOfficerUser(req);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
    include: {
      demands: true,
      timelines: {
        orderBy: { timestamp: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, role: true }
          }
        }
      },
    },
  });

  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  res.json({ data: maskIncidentContacts(incident, isOfficer) });
}));

// POST /api/incidents
router.post('/incidents', asyncHandler(async (req, res) => {
  const body = incidentCreateSchema.parse(req.body);

  // Generate unique human readable incidentId
  const count = await prisma.incident.count();
  const indexStr = String(count + 1).padStart(3, '0');
  const incidentId = `INC-2026-${indexStr}`;

  const incident = await prisma.incident.create({
    data: {
      ...body,
      incidentId,
    },
  });

  // Create automatic reported timeline event
  await prisma.incidentTimeline.create({
    data: {
      incidentId: incident.id,
      eventType: 'REPORTED',
      message: `Incident reported: ${incident.title} at ${incident.location}`,
    },
  });

  res.status(201).json({ data: incident });
}));

// PATCH /api/incidents/:id
router.patch('/incidents/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = incidentUpdateSchema.parse(req.body);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const findQuery = isUuid ? { id } : { incidentId: id };

  const existing = await prisma.incident.findUnique({ where: findQuery });
  if (!existing) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const updated = await prisma.incident.update({
    where: { id: existing.id },
    data: body,
  });

  res.json({ data: updated });
}));

// PATCH /api/incidents/:id/status
router.patch('/incidents/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = incidentStatusSchema.parse(req.body);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const findQuery = isUuid ? { id } : { incidentId: id };

  const existing = await prisma.incident.findUnique({ where: findQuery });
  if (!existing) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const updated = await prisma.incident.update({
    where: { id: existing.id },
    data: { status },
  });

  // Create automatic timeline event for status transition
  await prisma.incidentTimeline.create({
    data: {
      incidentId: existing.id,
      eventType: 'STATUS_UPDATE',
      message: `Incident status updated from ${existing.status} to ${status}`,
    },
  });

  res.json({ data: updated });
}));


/* ==========================================
   INCIDENT ASSESSMENT WORKFLOW
   ========================================== */

// Valid state transitions for assessment decisions
const ASSESSMENT_VALID_FROM_STATES: IncidentStatus[] = ['REPORTED', 'NEEDS_INFORMATION'];

const assessmentSchema = z.object({
  decision: z.enum(['CONFIRMED', 'NEEDS_INFORMATION', 'REJECTED']),
  assessmentNote: z.string().min(1, 'Assessment note is required.').max(2000),
  verificationMethods: z.array(z.string()).default([]),
  priorityAssessment: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  rejectionReason: z.string().optional(),
  infoRequestReason: z.string().optional(),
});

// GET /api/incidents/:id/assessment — returns the latest assessment record for an incident
router.get('/incidents/:id/assessment', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
  });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const assessments = await prisma.incidentAssessment.findMany({
    where: { incidentId: incident.id },
    orderBy: { timestamp: 'desc' },
    include: {
      officer: {
        select: { id: true, name: true, email: true, role: true, region: true }
      }
    }
  });

  res.json({ data: assessments });
}));

// GET /api/incidents/:id/timeline — returns timeline events from the database
router.get('/incidents/:id/timeline', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
  });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const timeline = await prisma.incidentTimeline.findMany({
    where: { incidentId: incident.id },
    orderBy: { timestamp: 'asc' },
    include: {
      actor: {
        select: { id: true, name: true, role: true }
      }
    }
  });

  res.json({ data: timeline });
}));

// POST /api/incidents/:id/assess — officer assessment decision (REQUIRES AUTH)
router.post('/incidents/:id/assess', requireOfficerAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const officer = (req as any).officer;

  // Parse and validate request body
  const body = assessmentSchema.parse(req.body);

  // Decision-specific validation
  if (body.decision === 'REJECTED' && !body.rejectionReason?.trim()) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'A rejection reason is required when rejecting an incident.' }
    });
  }
  if (body.decision === 'NEEDS_INFORMATION' && !body.infoRequestReason?.trim()) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'An information request reason is required.' }
    });
  }

  // Find the incident
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
  });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  // Validate state machine: assessment only valid from REPORTED or NEEDS_INFORMATION
  if (!ASSESSMENT_VALID_FROM_STATES.includes(incident.status)) {
    return res.status(409).json({
      error: {
        code: 'INVALID_LIFECYCLE_TRANSITION',
        message: `Cannot assess an incident in the '${incident.status}' state. Assessment is only valid for incidents in REPORTED or NEEDS_INFORMATION state.`
      }
    });
  }

  // Calculate corroboration: incidents within ~500m (approximately 0.0045 degrees lat/lng)
  const LAT_DELTA = 0.0045;
  const LNG_DELTA = 0.0045;
  const corroborationCount = await prisma.incident.count({
    where: {
      id: { not: incident.id },
      status: { notIn: ['RESOLVED', 'REJECTED'] },
      latitude: { gte: incident.latitude - LAT_DELTA, lte: incident.latitude + LAT_DELTA },
      longitude: { gte: incident.longitude - LNG_DELTA, lte: incident.longitude + LNG_DELTA },
    }
  });

  // Map decision to new incident status
  const statusMap: Record<string, IncidentStatus> = {
    CONFIRMED: IncidentStatus.VERIFIED,
    NEEDS_INFORMATION: IncidentStatus.NEEDS_INFORMATION,
    REJECTED: IncidentStatus.REJECTED,
  };
  const newStatus = statusMap[body.decision];

  // Run all DB operations in a transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // 1. Persist the assessment record
    const assessment = await tx.incidentAssessment.create({
      data: {
        incidentId: incident.id,
        officerId: officer.id,
        decision: body.decision,
        assessmentNote: body.assessmentNote,
        verificationMethods: body.verificationMethods,
        priorityAssessment: body.priorityAssessment || null,
        rejectionReason: body.rejectionReason || null,
        infoRequestReason: body.infoRequestReason || null,
        corroborationCount,
      },
      include: {
        officer: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    // 2. Update incident status
    const updatedIncident = await tx.incident.update({
      where: { id: incident.id },
      data: { status: newStatus },
    });

    // 3. Write auditable timeline event
    const timelineMessages: Record<string, string> = {
      CONFIRMED: `Incident confirmed and verified by ${officer.name} (${officer.role}). Assessment: "${body.assessmentNote.slice(0, 100)}${body.assessmentNote.length > 100 ? '...' : ''}". Methods: ${body.verificationMethods.join(', ') || 'None specified'}.`,
      NEEDS_INFORMATION: `Additional information requested by ${officer.name} (${officer.role}). Reason: "${body.infoRequestReason}".`,
      REJECTED: `Incident rejected by ${officer.name} (${officer.role}). Reason: "${body.rejectionReason}". Note: "${body.assessmentNote.slice(0, 100)}".`,
    };

    await tx.incidentTimeline.create({
      data: {
        incidentId: incident.id,
        eventType: `ASSESSMENT_${body.decision}`,
        message: timelineMessages[body.decision],
        actorId: officer.id,
        metadata: {
          decision: body.decision,
          officerId: officer.id,
          officerName: officer.name,
          officerRole: officer.role,
          assessmentNote: body.assessmentNote,
          verificationMethods: body.verificationMethods,
          priorityAssessment: body.priorityAssessment || null,
          rejectionReason: body.rejectionReason || null,
          infoRequestReason: body.infoRequestReason || null,
          corroborationCount,
          previousStatus: incident.status,
          newStatus,
        },
      },
    });

    return { assessment, incident: updatedIncident };
  });

  res.status(201).json({
    data: {
      assessment: result.assessment,
      incident: result.incident,
      message: `Incident assessment recorded. Status transitioned from ${incident.status} to ${newStatus}.`,
    }
  });
}));

/* ==========================================
   INCIDENT CONTACT & FIELD VERIFICATION EXTENSION
   ========================================== */

const contactLogSchema = z.object({
  method: z.enum(['PHONE', 'SMS', 'EMAIL', 'OTHER']),
  outcome: z.enum(['CONNECTED', 'NO_ANSWER', 'BUSY', 'INVALID_NUMBER', 'SENT', 'FAILED', 'OTHER']),
  note: z.string().max(1000).default(''),
});

const fieldVerificationSchema = z.object({
  assignedOfficerId: z.string().uuid('Valid Officer UUID required'),
});

const fieldVerificationUpdateSchema = z.object({
  status: z.enum(['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED']),
  observation: z.string().optional(),
  decision: z.enum(['CONFIRMED', 'NOT_CONFIRMED', 'INSUFFICIENT_INFORMATION']).optional(),
});

// GET /api/officers/available — list field officers available for assignment
router.get('/officers/available', requireOfficerAuth, asyncHandler(async (req, res) => {
  const officers = await prisma.officer.findMany({
    where: { accountStatus: 'ACTIVE' },
    select: { id: true, name: true, email: true, role: true, region: true }
  });
  res.json({ data: officers });
}));

// GET /api/incidents/:id/contacts — get communication logs
router.get('/incidents/:id/contacts', requireOfficerAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
  });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const logs = await prisma.incidentContactLog.findMany({
    where: { incidentId: incident.id },
    orderBy: { createdAt: 'desc' },
    include: {
      officer: { select: { id: true, name: true, role: true } }
    }
  });
  res.json({ data: logs });
}));

// POST /api/incidents/:id/contacts — log communication attempt
router.post('/incidents/:id/contacts', requireOfficerAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const officer = (req as any).officer;
  const body = contactLogSchema.parse(req.body);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
  });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const contactLog = await prisma.incidentContactLog.create({
    data: {
      incidentId: incident.id,
      officerId: officer.id,
      method: body.method,
      outcome: body.outcome,
      note: body.note,
    },
    include: {
      officer: { select: { id: true, name: true, role: true } }
    }
  });

  // Log in timeline
  await prisma.incidentTimeline.create({
    data: {
      incidentId: incident.id,
      eventType: `CONTACT_${body.method}`,
      message: `Reporter contacted via ${body.method.toLowerCase()}. Outcome: ${body.outcome.toLowerCase().replace('_', ' ')}. Note: "${body.note || 'None'}"`,
      actorId: officer.id,
      metadata: { method: body.method, outcome: body.outcome, note: body.note }
    }
  });

  res.status(201).json({ data: contactLog });
}));

// GET /api/incidents/:id/field-verification — get field verification status
router.get('/incidents/:id/field-verification', requireOfficerAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
  });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const verifications = await prisma.fieldVerification.findMany({
    where: { incidentId: incident.id },
    orderBy: { createdAt: 'desc' },
    include: {
      assignedOfficer: { select: { id: true, name: true, role: true } },
      requestedByOfficer: { select: { id: true, name: true, role: true } }
    }
  });
  res.json({ data: verifications });
}));

// POST /api/incidents/:id/field-verification — request field verification
router.post('/incidents/:id/field-verification', requireOfficerAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const officer = (req as any).officer;
  const body = fieldVerificationSchema.parse(req.body);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
  });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  if (incident.status === 'REJECTED') {
    return res.status(409).json({ error: { message: 'Cannot request field verification for a rejected incident.' } });
  }

  const fieldOfficer = await prisma.officer.findUnique({ where: { id: body.assignedOfficerId } });
  if (!fieldOfficer) {
    return res.status(404).json({ error: { message: 'Assigned field officer not found.' } });
  }

  // Set incident status to NEEDS_INFORMATION (or keep reported but mark that verification is pending)
  // Let's create the verification task
  const verification = await prisma.fieldVerification.create({
    data: {
      incidentId: incident.id,
      assignedOfficerId: body.assignedOfficerId,
      requestedByOfficerId: officer.id,
      status: 'ASSIGNED',
    },
    include: {
      assignedOfficer: { select: { id: true, name: true, role: true } },
      requestedByOfficer: { select: { id: true, name: true, role: true } }
    }
  });

  // Write timeline
  await prisma.incidentTimeline.create({
    data: {
      incidentId: incident.id,
      eventType: 'FIELD_VERIFICATION_REQUESTED',
      message: `Field verification requested. Assigned to officer ${fieldOfficer.name}.`,
      actorId: officer.id,
      metadata: { verificationId: verification.id, assignedOfficerId: fieldOfficer.id }
    }
  });

  res.status(201).json({ data: verification });
}));

// PATCH /api/field-verifications/:id — update verification progress/report (travel/observe)
router.patch('/field-verifications/:id', requireOfficerAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const officer = (req as any).officer;
  const body = fieldVerificationUpdateSchema.parse(req.body);

  const verification = await prisma.fieldVerification.findUnique({
    where: { id },
  });
  if (!verification) {
    return res.status(404).json({ error: { message: 'Field verification task not found.' } });
  }

  // Validate decision required for completion
  if (body.status === 'COMPLETED' && (!body.observation || !body.decision)) {
    return res.status(400).json({ error: { message: 'Observation and decision are required to complete field verification.' } });
  }

  const updated = await prisma.fieldVerification.update({
    where: { id },
    data: {
      status: body.status,
      observation: body.observation || verification.observation,
      decision: body.decision || verification.decision,
    },
    include: {
      assignedOfficer: { select: { id: true, name: true, role: true } }
    }
  });

  // Log to timeline
  let timelineMsg = `Field verification status updated to ${body.status.toLowerCase().replace('_', ' ')} by ${officer.name}.`;
  if (body.status === 'COMPLETED') {
    timelineMsg = `Field verification completed by ${officer.name}. Decision: ${body.decision}. Observation: "${body.observation}"`;
  }

  await prisma.incidentTimeline.create({
    data: {
      incidentId: verification.incidentId,
      eventType: `FIELD_VERIFICATION_${body.status}`,
      message: timelineMsg,
      actorId: officer.id,
      metadata: { status: body.status, decision: body.decision, observation: body.observation }
    }
  });

  res.json({ data: updated });
}));



const demandCreateSchema = z.object({
  incidentId: z.string().uuid('Valid Incident UUID required'),
  affectedZone: z.string().min(1, 'Affected zone is required'),
  requestedType: z.string().min(1, 'Requested type is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  affectedPeople: z.number().int().nonnegative().optional(),
  priority: z.nativeEnum(DemandPriority),
  status: z.nativeEnum(DemandStatus).optional(),
  requiredBy: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});

const demandUpdateSchema = demandCreateSchema.partial();

const demandStatusSchema = z.object({
  status: z.nativeEnum(DemandStatus),
});

// GET /api/demands
router.get('/demands', asyncHandler(async (req, res) => {
  const { status, priority, incidentId, limit = '50', offset = '0' } = req.query;

  const where: any = {};

  if (status) {
    where.status = status as DemandStatus;
  }
  if (priority) {
    where.priority = priority as DemandPriority;
  }
  if (incidentId) {
    where.incidentId = incidentId as string;
  }

  const [demands, total] = await Promise.all([
    prisma.demandRequest.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
      include: {
        incident: {
          select: { incidentId: true, title: true },
        },
      },
    }),
    prisma.demandRequest.count({ where }),
  ]);

  res.json({
    data: demands,
    meta: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  });
}));

// GET /api/demands/:id
router.get('/demands/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const demand = await prisma.demandRequest.findUnique({
    where: isUuid ? { id } : { requestId: id },
    include: {
      incident: true,
      allocations: {
        include: {
          resource: true,
          vehicle: true,
        },
      },
    },
  });

  if (!demand) {
    return res.status(404).json({ error: { message: `Demand request ${id} not found.` } });
  }

  res.json({ data: demand });
}));

// POST /api/demands
router.post('/demands', asyncHandler(async (req, res) => {
  const body = demandCreateSchema.parse(req.body);

  const count = await prisma.demandRequest.count();
  const indexStr = String(count + 101);
  const requestId = `REQ-DEL-${indexStr}`;

  const demand = await prisma.demandRequest.create({
    data: {
      ...body,
      requestId,
    },
  });

  // Log timeline event to Incident
  await prisma.incidentTimeline.create({
    data: {
      incidentId: body.incidentId,
      eventType: 'DEMAND_CREATED',
      message: `Emergency demand request ${requestId} created for ${demand.quantity} ${demand.unit} of ${demand.requestedType}.`,
    },
  });

  res.status(201).json({ data: demand });
}));

// PATCH /api/demands/:id
router.patch('/demands/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = demandUpdateSchema.parse(req.body);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const findQuery = isUuid ? { id } : { requestId: id };

  const existing = await prisma.demandRequest.findUnique({ where: findQuery });
  if (!existing) {
    return res.status(404).json({ error: { message: `Demand request ${id} not found.` } });
  }

  const updated = await prisma.demandRequest.update({
    where: { id: existing.id },
    data: body,
  });

  res.json({ data: updated });
}));

// PATCH /api/demands/:id/status
router.patch('/demands/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = demandStatusSchema.parse(req.body);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const findQuery = isUuid ? { id } : { requestId: id };

  const existing = await prisma.demandRequest.findUnique({ where: findQuery });
  if (!existing) {
    return res.status(404).json({ error: { message: `Demand request ${id} not found.` } });
  }

  const updated = await prisma.demandRequest.update({
    where: { id: existing.id },
    data: { status },
  });

  // Log timeline to incident
  await prisma.incidentTimeline.create({
    data: {
      incidentId: existing.incidentId,
      eventType: 'DEMAND_STATUS_UPDATE',
      message: `Demand request ${existing.requestId} status changed to ${status}`,
    },
  });

  res.json({ data: updated });
}));


/* ==========================================
   RESOURCES ROUTING
   ========================================== */

// GET /api/resources
router.get('/resources', asyncHandler(async (req, res) => {
  const { category, status, search, limit = '50', offset = '0' } = req.query;

  const where: any = {};

  if (category) {
    where.category = category as string;
  }
  if (status) {
    where.status = status as ResourceStatus;
  }
  if (search) {
    where.OR = [
      { resourceId: { contains: search as string, mode: 'insensitive' } },
      { materialName: { contains: search as string, mode: 'insensitive' } },
      { storageDepot: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { materialName: 'asc' },
    }),
    prisma.resource.count({ where }),
  ]);

  res.json({
    data: resources,
    meta: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  });
}));

// GET /api/resources/:id
router.get('/resources/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const resource = await prisma.resource.findUnique({
    where: isUuid ? { id } : { resourceId: id },
    include: {
      movements: {
        orderBy: { timestamp: 'desc' },
      },
      allocations: true,
    },
  });

  if (!resource) {
    return res.status(404).json({ error: { message: `Resource ${id} not found.` } });
  }

  res.json({ data: resource });
}));


/* ==========================================
   VEHICLES ROUTING
   ========================================== */

// GET /api/vehicles
router.get('/vehicles', asyncHandler(async (req, res) => {
  const { status, type, limit = '50', offset = '0' } = req.query;

  const where: any = {};

  if (status) {
    where.status = status as VehicleStatus;
  }
  if (type) {
    where.type = type as string;
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { vehicleId: 'asc' },
    }),
    prisma.vehicle.count({ where }),
  ]);

  res.json({
    data: vehicles,
    meta: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  });
}));

// GET /api/vehicles/:id
router.get('/vehicles/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const vehicle = await prisma.vehicle.findUnique({
    where: isUuid ? { id } : { vehicleId: id },
    include: {
      locations: {
        orderBy: { timestamp: 'desc' },
        take: 10,
      },
      dispatches: true,
    },
  });

  if (!vehicle) {
    return res.status(404).json({ error: { message: `Vehicle ${id} not found.` } });
  }

  res.json({ data: vehicle });
}));


/* ==========================================
   SHELTERS ROUTING
   ========================================== */

// GET /api/shelters
router.get('/shelters', asyncHandler(async (req, res) => {
  const { status, region, limit = '50', offset = '0' } = req.query;

  const where: any = {};

  if (status) {
    where.status = status as ShelterStatus;
  }
  if (region) {
    where.region = region as string;
  }

  const [shelters, total] = await Promise.all([
    prisma.shelter.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { shelterId: 'asc' },
    }),
    prisma.shelter.count({ where }),
  ]);

  res.json({
    data: shelters,
    meta: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  });
}));

// GET /api/shelters/:id
router.get('/shelters/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const shelter = await prisma.shelter.findUnique({
    where: isUuid ? { id } : { shelterId: id },
  });

  if (!shelter) {
    return res.status(404).json({ error: { message: `Shelter ${id} not found.` } });
  }

  res.json({ data: shelter });
}));


/* ==========================================
   TIMELINE ROUTING
   ========================================== */

const timelineCreateSchema = z.object({
  eventType: z.string().min(1, 'Event type is required'),
  message: z.string().min(1, 'Message is required'),
  actorId: z.string().uuid('Valid Officer UUID required').optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/incidents/:id/timeline
router.get('/incidents/:id/timeline', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const findQuery = isUuid ? { id } : { incidentId: id };

  const incident = await prisma.incident.findUnique({ where: findQuery });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const timeline = await prisma.incidentTimeline.findMany({
    where: { incidentId: incident.id },
    orderBy: { timestamp: 'desc' },
    include: {
      actor: {
        select: { name: true, role: true },
      },
    },
  });

  res.json({
    data: timeline,
    meta: {
      total: timeline.length,
    },
  });
}));

// POST /api/incidents/:id/timeline
router.post('/incidents/:id/timeline', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = timelineCreateSchema.parse(req.body);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const findQuery = isUuid ? { id } : { incidentId: id };

  const incident = await prisma.incident.findUnique({ where: findQuery });
  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  const timelineItem = await prisma.incidentTimeline.create({
    data: {
      incidentId: incident.id,
      eventType: body.eventType,
      message: body.message,
      actorId: body.actorId,
      metadata: body.metadata,
    },
    include: {
      actor: {
        select: { name: true, role: true },
      },
    },
  });

  res.status(201).json({ data: timelineItem });
}));


/* ==========================================
   DISPATCH ROUTING & SCHEMAS
   ========================================== */

const dispatchCreateSchema = z.object({
  allocationId: z.string().uuid('Valid Allocation UUID required'),
  vehicleId: z.string().uuid('Valid Vehicle UUID required'),
  assignedOfficerId: z.string().uuid('Valid Officer UUID required').optional(),
  plannedDeparture: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  eta: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  notes: z.string().optional(),
});

// GET /api/dispatch
router.get('/dispatch', asyncHandler(async (req, res) => {
  const { status, priority, vehicleId, search } = req.query;

  const where: any = {};

  if (status) {
    where.status = status as DispatchStatus;
  }
  if (vehicleId) {
    where.vehicleId = vehicleId as string;
  }
  if (priority) {
    where.priority = priority as string;
  }
  if (search) {
    where.OR = [
      { dispatchId: { contains: search as string, mode: 'insensitive' } },
      { origin: { contains: search as string, mode: 'insensitive' } },
      { destination: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const dispatches = await prisma.dispatch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      allocation: {
        include: {
          demand: {
            include: {
              incident: true
            }
          },
          resource: true
        }
      },
      vehicle: true,
      officer: {
        select: { name: true, role: true }
      }
    }
  });

  res.json({ data: dispatches });
}));

// POST /api/dispatch
router.post('/dispatch', asyncHandler(async (req, res) => {
  const body = dispatchCreateSchema.parse(req.body);

  // Generate unique dispatchId
  const count = await prisma.dispatch.count();
  const indexStr = String(count + 1).padStart(3, '0');
  const dispatchId = `DSP-2026-${indexStr}`;

  // Fetch allocation, vehicle, and officer
  const allocation = await prisma.allocation.findUnique({
    where: { id: body.allocationId },
    include: {
      demand: {
        include: {
          incident: true
        }
      },
      resource: true
    }
  });

  if (!allocation) {
    return res.status(404).json({ error: { message: `Allocation ${body.allocationId} not found.` } });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: body.vehicleId }
  });

  if (!vehicle) {
    return res.status(404).json({ error: { message: `Vehicle ${body.vehicleId} not found.` } });
  }

  let officerName = null;
  if (body.assignedOfficerId) {
    const officer = await prisma.officer.findUnique({
      where: { id: body.assignedOfficerId }
    });
    if (officer) {
      officerName = officer.name;
    }
  }

  // Create dispatch
  const dispatch = await prisma.dispatch.create({
    data: {
      dispatchId,
      allocationId: body.allocationId,
      vehicleId: body.vehicleId,
      origin: allocation.resource.storageDepot || allocation.resource.location || "Central Depot",
      destination: allocation.demand.incident.location,
      assignedOfficer: officerName,
      assignedOfficerId: body.assignedOfficerId,
      plannedDeparture: body.plannedDeparture || new Date(),
      estimatedArrival: body.eta || new Date(Date.now() + 3600 * 1000), // 1 hour default
      quantity: allocation.demand.quantity,
      priority: allocation.demand.priority,
      status: DispatchStatus.DISPATCHED, // Immediately set to active/dispatched as confirmed
      notes: body.notes,
      latitude: allocation.demand.incident.latitude,
      longitude: allocation.demand.incident.longitude
    },
    include: {
      allocation: {
        include: {
          demand: {
            include: {
              incident: true
            }
          },
          resource: true
        }
      },
      vehicle: true,
      officer: {
        select: { name: true, role: true }
      }
    }
  });

  // Automatically transition related vehicle, allocation, and demand states
  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: {
      status: VehicleStatus.DISPATCHED,
      currentMission: dispatchId
    }
  });

  await prisma.allocation.update({
    where: { id: allocation.id },
    data: {
      status: AllocationStatus.DISPATCHED
    }
  });

  await prisma.demandRequest.update({
    where: { id: allocation.demandId },
    data: {
      status: DemandStatus.DISPATCHED
    }
  });

  // Log timeline to incident
  await prisma.incidentTimeline.create({
    data: {
      incidentId: allocation.demand.incidentId,
      eventType: 'VEHICLE_DISPATCHED',
      message: `Vehicle ${vehicle.vehicleId} (${vehicle.name}) dispatched under mission ${dispatchId} carrying ${allocation.demand.quantity} ${allocation.demand.unit} of ${allocation.demand.requestedType} to destination.`,
      actorId: body.assignedOfficerId
    }
  });

  res.status(201).json({ data: dispatch });
}));

// PATCH /api/dispatch/:id/status?nextStatus=...
router.patch('/dispatch/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nextStatus } = req.query;
  const { notes, officerId } = req.body;

  if (!nextStatus) {
    return res.status(400).json({ error: { message: "Query parameter nextStatus is required." } });
  }

  const dispatch = await prisma.dispatch.findUnique({
    where: { id },
    include: {
      allocation: {
        include: {
          demand: {
            include: {
              incident: true
            }
          }
        }
      },
      vehicle: true
    }
  });

  if (!dispatch) {
    return res.status(404).json({ error: { message: `Dispatch ${id} not found.` } });
  }

  const updated = await prisma.dispatch.update({
    where: { id },
    data: {
      status: nextStatus as DispatchStatus,
      notes: notes || dispatch.notes,
      completionTime: nextStatus === DispatchStatus.COMPLETED ? new Date() : dispatch.completionTime
    },
    include: {
      allocation: {
        include: {
          demand: {
            include: {
              incident: true
            }
          },
          resource: true
        }
      },
      vehicle: true,
      officer: {
        select: { name: true, role: true }
      }
    }
  });

  // Sync related models on completion or cancellation
  if (nextStatus === DispatchStatus.COMPLETED) {
    await prisma.vehicle.update({
      where: { id: dispatch.vehicleId },
      data: {
        status: VehicleStatus.AVAILABLE,
        currentMission: null
      }
    });

    await prisma.allocation.update({
      where: { id: dispatch.allocationId },
      data: {
        status: AllocationStatus.COMPLETED
      }
    });

    await prisma.demandRequest.update({
      where: { id: dispatch.allocation.demandId },
      data: {
        status: DemandStatus.FULFILLED
      }
    });

    await prisma.incidentTimeline.create({
      data: {
        incidentId: dispatch.allocation.demand.incidentId,
        eventType: 'DELIVERY_COMPLETED',
        message: `Delivery completed: Mission ${dispatch.dispatchId} arrived and verified.`,
        actorId: officerId
      }
    });
  } else if (nextStatus === DispatchStatus.CANCELLED || nextStatus === DispatchStatus.FAILED) {
    await prisma.vehicle.update({
      where: { id: dispatch.vehicleId },
      data: {
        status: VehicleStatus.AVAILABLE,
        currentMission: null
      }
    });

    await prisma.allocation.update({
      where: { id: dispatch.allocationId },
      data: {
        status: AllocationStatus.REJECTED
      }
    });

    await prisma.demandRequest.update({
      where: { id: dispatch.allocation.demandId },
      data: {
        status: DemandStatus.PENDING
      }
    });

    await prisma.incidentTimeline.create({
      data: {
        incidentId: dispatch.allocation.demand.incidentId,
        eventType: 'DISPATCH_CANCELLED',
        message: `Mission ${dispatch.dispatchId} cancelled/failed: ${notes || "No explanation provided"}.`,
        actorId: officerId
      }
    });
  }

  res.json({ data: updated });
}));

// PATCH /api/dispatch/:id/route
router.patch('/dispatch/:id/route', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const routeData = req.body;

  const dispatch = await prisma.dispatch.findUnique({
    where: { id }
  });

  if (!dispatch) {
    return res.status(404).json({ error: { message: `Dispatch ${id} not found.` } });
  }

  const updated = await prisma.dispatch.update({
    where: { id },
    data: {
      latitude: routeData.latitude || dispatch.latitude,
      longitude: routeData.longitude || dispatch.longitude,
      notes: routeData.notes || dispatch.notes
    },
    include: {
      allocation: {
        include: {
          demand: {
            include: {
              incident: true
            }
          },
          resource: true
        }
      },
      vehicle: true,
      officer: {
        select: { name: true, role: true }
      }
    }
  });

  res.json({ data: updated });
}));


/* ==========================================
   DELIVERIES ROUTING
   ========================================== */

// GET /api/delivery
router.get('/delivery', asyncHandler(async (req, res) => {
  const deliveries = await prisma.delivery.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      dispatch: {
        include: {
          allocation: {
            include: {
              demand: {
                include: {
                  incident: true
                }
              }
            }
          },
          vehicle: true
        }
      }
    }
  });

  res.json({ data: deliveries });
}));

// PATCH /api/delivery/:id/status
router.patch('/delivery/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;
  const { notes, deliveredQty, verifiedBy } = req.body;

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      dispatch: true
    }
  });

  if (!delivery) {
    return res.status(404).json({ error: { message: `Delivery ${id} not found.` } });
  }

  const updated = await prisma.delivery.update({
    where: { id },
    data: {
      status: status as DeliveryStatus,
      notes: notes || delivery.notes,
      deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : delivery.deliveredAt,
      receivedBy: verifiedBy || delivery.receivedBy
    },
    include: {
      dispatch: {
        include: {
          allocation: {
            include: {
              demand: {
                include: {
                  incident: true
                }
              }
            }
          },
          vehicle: true
        }
      }
    }
  });

  res.json({ data: updated });
}));

export { router as apiRouter };
