"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db/db.js");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
exports.apiRouter = router;
// Helper to wrap async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
/* ==========================================
   INCIDENT ROUTING & SCHEMAS
   ========================================== */
const incidentCreateSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, 'Incident type is required'),
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().min(1, 'Description is required'),
    location: zod_1.z.string().min(1, 'Location is required'),
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
    region: zod_1.z.string().min(1, 'Region is required'),
    severity: zod_1.z.nativeEnum(client_1.Severity),
    status: zod_1.z.nativeEnum(client_1.IncidentStatus).optional(),
    affectedPeople: zod_1.z.number().int().nonnegative().optional(),
    displacedPeople: zod_1.z.number().int().nonnegative().optional(),
    assignedUnit: zod_1.z.string().optional(),
});
const incidentUpdateSchema = incidentCreateSchema.partial();
const incidentStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.IncidentStatus),
});
// GET /api/incidents (with filter & search)
router.get('/incidents', asyncHandler(async (req, res) => {
    const { status, severity, search, region, limit = '50', offset = '0' } = req.query;
    const where = {};
    if (status) {
        where.status = status;
    }
    if (severity) {
        where.severity = severity;
    }
    if (region) {
        where.region = region;
    }
    if (search) {
        where.OR = [
            { incidentId: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
        ];
    }
    const [incidents, total] = await Promise.all([
        db_js_1.prisma.incident.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { reportedAt: 'desc' },
            include: {
                demands: true,
            },
        }),
        db_js_1.prisma.incident.count({ where }),
    ]);
    res.json({
        data: incidents,
        meta: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    });
}));
// GET /api/incidents/:id (Can be UUID or human-readable incidentId)
router.get('/incidents/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const incident = await db_js_1.prisma.incident.findUnique({
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
    const count = await db_js_1.prisma.incident.count();
    const indexStr = String(count + 1).padStart(3, '0');
    const incidentId = `INC-2026-${indexStr}`;
    const incident = await db_js_1.prisma.incident.create({
        data: {
            ...body,
            incidentId,
        },
    });
    // Create automatic reported timeline event
    await db_js_1.prisma.incidentTimeline.create({
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
    const existing = await db_js_1.prisma.incident.findUnique({ where: findQuery });
    if (!existing) {
        return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
    }
    const updated = await db_js_1.prisma.incident.update({
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
    const existing = await db_js_1.prisma.incident.findUnique({ where: findQuery });
    if (!existing) {
        return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
    }
    const updated = await db_js_1.prisma.incident.update({
        where: { id: existing.id },
        data: { status },
    });
    // Create automatic timeline event for status transition
    await db_js_1.prisma.incidentTimeline.create({
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
const demandCreateSchema = zod_1.z.object({
    incidentId: zod_1.z.string().uuid('Valid Incident UUID required'),
    affectedZone: zod_1.z.string().min(1, 'Affected zone is required'),
    requestedType: zod_1.z.string().min(1, 'Requested type is required'),
    description: zod_1.z.string().min(1, 'Description is required'),
    quantity: zod_1.z.number().positive('Quantity must be greater than 0'),
    unit: zod_1.z.string().min(1, 'Unit is required'),
    affectedPeople: zod_1.z.number().int().nonnegative().optional(),
    priority: zod_1.z.nativeEnum(client_1.DemandPriority),
    status: zod_1.z.nativeEnum(client_1.DemandStatus).optional(),
    requiredBy: zod_1.z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});
const demandUpdateSchema = demandCreateSchema.partial();
const demandStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.DemandStatus),
});
// GET /api/demands
router.get('/demands', asyncHandler(async (req, res) => {
    const { status, priority, incidentId, limit = '50', offset = '0' } = req.query;
    const where = {};
    if (status) {
        where.status = status;
    }
    if (priority) {
        where.priority = priority;
    }
    if (incidentId) {
        where.incidentId = incidentId;
    }
    const [demands, total] = await Promise.all([
        db_js_1.prisma.demandRequest.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { createdAt: 'desc' },
            include: {
                incident: {
                    select: { incidentId: true, title: true },
                },
            },
        }),
        db_js_1.prisma.demandRequest.count({ where }),
    ]);
    res.json({
        data: demands,
        meta: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    });
}));
// GET /api/demands/:id
router.get('/demands/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const demand = await db_js_1.prisma.demandRequest.findUnique({
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
    const count = await db_js_1.prisma.demandRequest.count();
    const indexStr = String(count + 101);
    const requestId = `REQ-DEL-${indexStr}`;
    const demand = await db_js_1.prisma.demandRequest.create({
        data: {
            ...body,
            requestId,
        },
    });
    // Log timeline event to Incident
    await db_js_1.prisma.incidentTimeline.create({
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
    const existing = await db_js_1.prisma.demandRequest.findUnique({ where: findQuery });
    if (!existing) {
        return res.status(404).json({ error: { message: `Demand request ${id} not found.` } });
    }
    const updated = await db_js_1.prisma.demandRequest.update({
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
    const existing = await db_js_1.prisma.demandRequest.findUnique({ where: findQuery });
    if (!existing) {
        return res.status(404).json({ error: { message: `Demand request ${id} not found.` } });
    }
    const updated = await db_js_1.prisma.demandRequest.update({
        where: { id: existing.id },
        data: { status },
    });
    // Log timeline to incident
    await db_js_1.prisma.incidentTimeline.create({
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
    const where = {};
    if (category) {
        where.category = category;
    }
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { resourceId: { contains: search, mode: 'insensitive' } },
            { materialName: { contains: search, mode: 'insensitive' } },
            { storageDepot: { contains: search, mode: 'insensitive' } },
        ];
    }
    const [resources, total] = await Promise.all([
        db_js_1.prisma.resource.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { materialName: 'asc' },
        }),
        db_js_1.prisma.resource.count({ where }),
    ]);
    res.json({
        data: resources,
        meta: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    });
}));
// GET /api/resources/:id
router.get('/resources/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const resource = await db_js_1.prisma.resource.findUnique({
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
    const where = {};
    if (status) {
        where.status = status;
    }
    if (type) {
        where.type = type;
    }
    const [vehicles, total] = await Promise.all([
        db_js_1.prisma.vehicle.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { vehicleId: 'asc' },
        }),
        db_js_1.prisma.vehicle.count({ where }),
    ]);
    res.json({
        data: vehicles,
        meta: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    });
}));
// GET /api/vehicles/:id
router.get('/vehicles/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const vehicle = await db_js_1.prisma.vehicle.findUnique({
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
    const where = {};
    if (status) {
        where.status = status;
    }
    if (region) {
        where.region = region;
    }
    const [shelters, total] = await Promise.all([
        db_js_1.prisma.shelter.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { shelterId: 'asc' },
        }),
        db_js_1.prisma.shelter.count({ where }),
    ]);
    res.json({
        data: shelters,
        meta: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    });
}));
// GET /api/shelters/:id
router.get('/shelters/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const shelter = await db_js_1.prisma.shelter.findUnique({
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
const timelineCreateSchema = zod_1.z.object({
    eventType: zod_1.z.string().min(1, 'Event type is required'),
    message: zod_1.z.string().min(1, 'Message is required'),
    actorId: zod_1.z.string().uuid('Valid Officer UUID required').optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// GET /api/incidents/:id/timeline
router.get('/incidents/:id/timeline', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const findQuery = isUuid ? { id } : { incidentId: id };
    const incident = await db_js_1.prisma.incident.findUnique({ where: findQuery });
    if (!incident) {
        return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
    }
    const timeline = await db_js_1.prisma.incidentTimeline.findMany({
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
    const incident = await db_js_1.prisma.incident.findUnique({ where: findQuery });
    if (!incident) {
        return res.status(404).json({ error: { message: `Incident ${id} not found.` } });
    }
    const timelineItem = await db_js_1.prisma.incidentTimeline.create({
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
