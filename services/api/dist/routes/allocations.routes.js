"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocationsRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db/db.js");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
exports.allocationsRouter = router;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
const allocationCreateSchema = zod_1.z.object({
    demandId: zod_1.z.string().uuid('Valid Demand Request UUID required'),
    resourceId: zod_1.z.string().uuid('Valid Resource UUID required'),
    quantity: zod_1.z.number().positive('Quantity must be greater than 0'),
    vehicleId: zod_1.z.string().uuid('Valid Vehicle UUID required').optional(),
});
const allocationRejectSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, 'Rejection reason is required'),
});
// Helper to generate custom allocation ID
async function generateAllocationId() {
    const count = await db_js_1.prisma.allocation.count();
    return `ALL-2026-${String(count + 1).padStart(3, '0')}`;
}
// GET /api/allocations
router.get('/', asyncHandler(async (req, res) => {
    const { status, demandId, resourceId, search, limit = '50', offset = '0' } = req.query;
    const where = {};
    if (status) {
        where.status = status;
    }
    if (demandId) {
        where.demandId = demandId;
    }
    if (resourceId) {
        where.resourceId = resourceId;
    }
    if (search) {
        where.OR = [
            { allocationId: { contains: search, mode: 'insensitive' } },
        ];
    }
    const [allocations, total] = await Promise.all([
        db_js_1.prisma.allocation.findMany({
            where,
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { createdAt: 'desc' },
            include: {
                demand: {
                    include: { incident: true },
                },
                resource: true,
                vehicle: true,
                approvedBy: {
                    select: { name: true, role: true },
                },
            },
        }),
        db_js_1.prisma.allocation.count({ where }),
    ]);
    res.json({
        data: allocations,
        meta: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    });
}));
// GET /api/allocations/:id
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const allocation = await db_js_1.prisma.allocation.findUnique({
        where: isUuid ? { id } : { allocationId: id },
        include: {
            demand: {
                include: { incident: true },
            },
            resource: true,
            vehicle: true,
            approvedBy: {
                select: { name: true, role: true },
            },
        },
    });
    if (!allocation) {
        return res.status(404).json({ error: { message: `Allocation ${id} not found.` } });
    }
    res.json({ data: allocation });
}));
// POST /api/allocations (Create recommendation allocation)
router.post('/', asyncHandler(async (req, res) => {
    const { demandId, resourceId, quantity, vehicleId } = allocationCreateSchema.parse(req.body);
    // Authenticated/Officer authorization header validation
    const officerEmail = req.headers['x-officer-email'];
    let officerId = null;
    if (officerEmail) {
        const officer = await db_js_1.prisma.officer.findUnique({ where: { email: officerEmail } });
        if (!officer) {
            return res.status(403).json({ error: { message: 'Unauthorized: Officer account not found.' } });
        }
        officerId = officer.id;
    }
    // Database Transaction isolation
    const result = await db_js_1.prisma.$transaction(async (tx) => {
        // 1. Revalidate Resource Availability
        const resource = await resForUpdate(tx, resourceId);
        if (!resource)
            throw new Error('Resource not found.');
        const unreservedQty = resource.availableQuantity - resource.reservedQuantity;
        if (unreservedQty < quantity) {
            throw new Error(`Insufficient resource inventory: only ${unreservedQty} available.`);
        }
        // 2. Revalidate Demand Request
        const demand = await tx.demandRequest.findUnique({ where: { id: demandId } });
        if (!demand)
            throw new Error('Demand request not found.');
        if (demand.status === client_1.DemandStatus.FULFILLED || demand.status === client_1.DemandStatus.CANCELLED) {
            throw new Error(`Demand request is no longer active (status: ${demand.status}).`);
        }
        // 3. Create Allocation record
        const allocationId = await generateAllocationId();
        const allocation = await tx.allocation.create({
            data: {
                allocationId,
                demandId,
                resourceId,
                vehicleId,
                status: client_1.AllocationStatus.RECOMMENDED,
                approvedById: officerId,
            },
        });
        // 4. Update Resource quantity (reserve it)
        await tx.resource.update({
            where: { id: resourceId },
            data: {
                reservedQuantity: { increment: quantity },
                status: resource.availableQuantity - (resource.reservedQuantity + quantity) <= 0
                    ? client_1.ResourceStatus.RESERVED
                    : client_1.ResourceStatus.LOW,
            },
        });
        // 5. Update Demand request status
        await tx.demandRequest.update({
            where: { id: demandId },
            data: { status: client_1.DemandStatus.MATCHED },
        });
        // 6. Log Timeline entry to Incident
        await tx.incidentTimeline.create({
            data: {
                incidentId: demand.incidentId,
                eventType: 'ALLOCATION_CREATED',
                message: `Resource allocation ${allocationId} created for ${quantity} units.`,
                actorId: officerId,
            },
        });
        return allocation;
    });
    res.status(201).json({ data: result });
}));
// POST /api/allocations/:id/approve
router.post('/:id/approve', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const officerEmail = req.headers['x-officer-email'];
    let officerId = null;
    if (officerEmail) {
        const officer = await db_js_1.prisma.officer.findUnique({ where: { email: officerEmail } });
        if (!officer) {
            return res.status(403).json({ error: { message: 'Unauthorized: Officer account not found.' } });
        }
        officerId = officer.id;
    }
    const findQuery = isUuid ? { id } : { allocationId: id };
    const result = await db_js_1.prisma.$transaction(async (tx) => {
        const allocation = await tx.allocation.findUnique({
            where: findQuery,
            include: { demand: true, resource: true },
        });
        if (!allocation)
            throw new Error('Allocation record not found.');
        if (allocation.status === client_1.AllocationStatus.APPROVED) {
            throw new Error('Allocation is already approved.');
        }
        // Update allocation record
        const updated = await tx.allocation.update({
            where: { id: allocation.id },
            data: {
                status: client_1.AllocationStatus.APPROVED,
                approvedById: officerId,
                approvedAt: new Date(),
            },
        });
        // Transition demand state to ALLOCATED
        await tx.demandRequest.update({
            where: { id: allocation.demandId },
            data: { status: client_1.DemandStatus.ALLOCATED },
        });
        // Create timeline event
        await tx.incidentTimeline.create({
            data: {
                incidentId: allocation.demand.incidentId,
                eventType: 'ALLOCATION_APPROVED',
                message: `Resource ${allocation.resource.resourceId} allocated to request ${allocation.demand.requestId} approved.`,
                actorId: officerId,
            },
        });
        // Create system notification
        await tx.notification.create({
            data: {
                recipient: 'system-alerts',
                type: 'ALLOCATION_APPROVED',
                title: 'Allocation Approved',
                message: `Allocation of ${allocation.demand.quantity} ${allocation.demand.unit} has been approved.`,
                incidentId: allocation.demand.incidentId,
                resourceId: allocation.resourceId,
            },
        });
        return updated;
    });
    res.json({ data: result });
}));
// POST /api/allocations/:id/reject
router.post('/:id/reject', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = allocationRejectSchema.parse(req.body);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const officerEmail = req.headers['x-officer-email'];
    let officerId = null;
    if (officerEmail) {
        const officer = await db_js_1.prisma.officer.findUnique({ where: { email: officerEmail } });
        if (!officer) {
            return res.status(403).json({ error: { message: 'Unauthorized: Officer account not found.' } });
        }
        officerId = officer.id;
    }
    const findQuery = isUuid ? { id } : { allocationId: id };
    const result = await db_js_1.prisma.$transaction(async (tx) => {
        const allocation = await tx.allocation.findUnique({
            where: findQuery,
            include: { demand: true, resource: true },
        });
        if (!allocation)
            throw new Error('Allocation record not found.');
        if (allocation.status === client_1.AllocationStatus.REJECTED) {
            throw new Error('Allocation is already rejected.');
        }
        // Update allocation record
        const updated = await tx.allocation.update({
            where: { id: allocation.id },
            data: {
                status: client_1.AllocationStatus.REJECTED,
            },
        });
        // Return quantity to resource available pool (unreserve it)
        await tx.resource.update({
            where: { id: allocation.resourceId },
            data: {
                reservedQuantity: { decrement: allocation.demand.quantity },
                status: client_1.ResourceStatus.AVAILABLE,
            },
        });
        // Revert demand state to PENDING
        await tx.demandRequest.update({
            where: { id: allocation.demandId },
            data: { status: client_1.DemandStatus.PENDING },
        });
        // Log timeline event
        await tx.incidentTimeline.create({
            data: {
                incidentId: allocation.demand.incidentId,
                eventType: 'ALLOCATION_REJECTED',
                message: `Allocation of ${allocation.resource.resourceId} rejected. Reason: ${reason}`,
                actorId: officerId,
            },
        });
        return updated;
    });
    res.json({ data: result });
}));
// Helper to handle raw locking of database records
async function resForUpdate(tx, id) {
    // Run raw SQL select to lock the resource record
    const res = await tx.$queryRaw `
    SELECT "availableQuantity", "reservedQuantity", "status", "unit"
    FROM "Resource"
    WHERE id = ${id}::uuid
    LIMIT 1
    FOR UPDATE
  `;
    return res.length > 0 ? res[0] : null;
}
