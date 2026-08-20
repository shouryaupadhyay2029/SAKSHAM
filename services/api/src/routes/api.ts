import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/db.js';
import { z } from 'zod';
import { Severity, IncidentStatus, DemandPriority, DemandStatus, ResourceStatus, VehicleStatus, ShelterStatus } from '@prisma/client';

const router = Router();

// Helper to wrap async route handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

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
});

const incidentUpdateSchema = incidentCreateSchema.partial();

const incidentStatusSchema = z.object({
  status: z.nativeEnum(IncidentStatus),
});

// GET /api/incidents (with filter & search)
router.get('/incidents', asyncHandler(async (req, res) => {
  const { status, severity, search, region, limit = '50', offset = '0' } = req.query;

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

  res.json({
    data: incidents,
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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const incident = await prisma.incident.findUnique({
    where: isUuid ? { id } : { incidentId: id },
    include: {
      demands: true,
      timelines: {
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  if (!incident) {
    return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
  }

  res.json({ data: incident });
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
   DEMANDS ROUTING & SCHEMAS
   ========================================== */

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

export { router as apiRouter };
