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
/* ==========================================
   DISPATCH ROUTING & SCHEMAS
   ========================================== */
const dispatchCreateSchema = zod_1.z.object({
    allocationId: zod_1.z.string().uuid('Valid Allocation UUID required'),
    vehicleId: zod_1.z.string().uuid('Valid Vehicle UUID required'),
    assignedOfficerId: zod_1.z.string().uuid('Valid Officer UUID required').optional(),
    plannedDeparture: zod_1.z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
    eta: zod_1.z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
    notes: zod_1.z.string().optional(),
});
// GET /api/dispatch
router.get('/dispatch', asyncHandler(async (req, res) => {
    const { status, priority, vehicleId, search } = req.query;
    const where = {};
    if (status) {
        where.status = status;
    }
    if (vehicleId) {
        where.vehicleId = vehicleId;
    }
    if (priority) {
        where.priority = priority;
    }
    if (search) {
        where.OR = [
            { dispatchId: { contains: search, mode: 'insensitive' } },
            { origin: { contains: search, mode: 'insensitive' } },
            { destination: { contains: search, mode: 'insensitive' } },
        ];
    }
    const dispatches = await db_js_1.prisma.dispatch.findMany({
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
    const count = await db_js_1.prisma.dispatch.count();
    const indexStr = String(count + 1).padStart(3, '0');
    const dispatchId = `DSP-2026-${indexStr}`;
    // Fetch allocation, vehicle, and officer
    const allocation = await db_js_1.prisma.allocation.findUnique({
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
    const vehicle = await db_js_1.prisma.vehicle.findUnique({
        where: { id: body.vehicleId }
    });
    if (!vehicle) {
        return res.status(404).json({ error: { message: `Vehicle ${body.vehicleId} not found.` } });
    }
    let officerName = null;
    if (body.assignedOfficerId) {
        const officer = await db_js_1.prisma.officer.findUnique({
            where: { id: body.assignedOfficerId }
        });
        if (officer) {
            officerName = officer.name;
        }
    }
    // Create dispatch
    const dispatch = await db_js_1.prisma.dispatch.create({
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
            status: client_1.DispatchStatus.DISPATCHED, // Immediately set to active/dispatched as confirmed
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
    await db_js_1.prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
            status: client_1.VehicleStatus.DISPATCHED,
            currentMission: dispatchId
        }
    });
    await db_js_1.prisma.allocation.update({
        where: { id: allocation.id },
        data: {
            status: client_1.AllocationStatus.DISPATCHED
        }
    });
    await db_js_1.prisma.demandRequest.update({
        where: { id: allocation.demandId },
        data: {
            status: client_1.DemandStatus.DISPATCHED
        }
    });
    // Log timeline to incident
    await db_js_1.prisma.incidentTimeline.create({
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
    const dispatch = await db_js_1.prisma.dispatch.findUnique({
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
    const updated = await db_js_1.prisma.dispatch.update({
        where: { id },
        data: {
            status: nextStatus,
            notes: notes || dispatch.notes,
            completionTime: nextStatus === client_1.DispatchStatus.COMPLETED ? new Date() : dispatch.completionTime
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
    if (nextStatus === client_1.DispatchStatus.COMPLETED) {
        await db_js_1.prisma.vehicle.update({
            where: { id: dispatch.vehicleId },
            data: {
                status: client_1.VehicleStatus.AVAILABLE,
                currentMission: null
            }
        });
        await db_js_1.prisma.allocation.update({
            where: { id: dispatch.allocationId },
            data: {
                status: client_1.AllocationStatus.COMPLETED
            }
        });
        await db_js_1.prisma.demandRequest.update({
            where: { id: dispatch.allocation.demandId },
            data: {
                status: client_1.DemandStatus.FULFILLED
            }
        });
        await db_js_1.prisma.incidentTimeline.create({
            data: {
                incidentId: dispatch.allocation.demand.incidentId,
                eventType: 'DELIVERY_COMPLETED',
                message: `Delivery completed: Mission ${dispatch.dispatchId} arrived and verified.`,
                actorId: officerId
            }
        });
    }
    else if (nextStatus === client_1.DispatchStatus.CANCELLED || nextStatus === client_1.DispatchStatus.FAILED) {
        await db_js_1.prisma.vehicle.update({
            where: { id: dispatch.vehicleId },
            data: {
                status: client_1.VehicleStatus.AVAILABLE,
                currentMission: null
            }
        });
        await db_js_1.prisma.allocation.update({
            where: { id: dispatch.allocationId },
            data: {
                status: client_1.AllocationStatus.REJECTED
            }
        });
        await db_js_1.prisma.demandRequest.update({
            where: { id: dispatch.allocation.demandId },
            data: {
                status: client_1.DemandStatus.PENDING
            }
        });
        await db_js_1.prisma.incidentTimeline.create({
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
    const dispatch = await db_js_1.prisma.dispatch.findUnique({
        where: { id }
    });
    if (!dispatch) {
        return res.status(404).json({ error: { message: `Dispatch ${id} not found.` } });
    }
    const updated = await db_js_1.prisma.dispatch.update({
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
    const deliveries = await db_js_1.prisma.delivery.findMany({
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
    const delivery = await db_js_1.prisma.delivery.findUnique({
        where: { id },
        include: {
            dispatch: true
        }
    });
    if (!delivery) {
        return res.status(404).json({ error: { message: `Delivery ${id} not found.` } });
    }
    const updated = await db_js_1.prisma.delivery.update({
        where: { id },
        data: {
            status: status,
            notes: notes || delivery.notes,
            deliveredAt: status === client_1.DeliveryStatus.DELIVERED ? new Date() : delivery.deliveredAt,
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
