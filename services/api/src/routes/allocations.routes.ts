import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/db.js';
import { z } from 'zod';
import { DemandStatus, AllocationStatus, ResourceStatus } from '@prisma/client';

const router = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

const allocationCreateSchema = z.object({
  demandId: z.string().uuid('Valid Demand Request UUID required'),
  resourceId: z.string().uuid('Valid Resource UUID required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  vehicleId: z.string().uuid('Valid Vehicle UUID required').optional(),
});

const allocationRejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

// Helper to generate custom allocation ID
async function generateAllocationId(): Promise<string> {
  const count = await prisma.allocation.count();
  return `ALL-2026-${String(count + 1).padStart(3, '0')}`;
}

// GET /api/allocations
router.get('/', asyncHandler(async (req, res) => {
  const { status, demandId, resourceId, search, limit = '50', offset = '0' } = req.query;

  const where: any = {};
  if (status) {
    where.status = status as AllocationStatus;
  }
  if (demandId) {
    where.demandId = demandId as string;
  }
  if (resourceId) {
    where.resourceId = resourceId as string;
  }
  if (search) {
    where.OR = [
      { allocationId: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [allocations, total] = await Promise.all([
    prisma.allocation.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
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
    prisma.allocation.count({ where }),
  ]);

  res.json({
    data: allocations,
    meta: {
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    },
  });
}));

// GET /api/allocations/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const allocation = await prisma.allocation.findUnique({
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
  const officerEmail = req.headers['x-officer-email'] as string;
  let officerId: string | null = null;
  if (officerEmail) {
    const officer = await prisma.officer.findUnique({ where: { email: officerEmail } });
    if (!officer) {
      return res.status(403).json({ error: { message: 'Unauthorized: Officer account not found.' } });
    }
    officerId = officer.id;
  }

  // Database Transaction isolation
  const result = await prisma.$transaction(async (tx) => {
    // 1. Revalidate Resource Availability
    const resource = await resForUpdate(tx, resourceId);
    if (!resource) throw new Error('Resource not found.');
    const unreservedQty = resource.availableQuantity - resource.reservedQuantity;
    if (unreservedQty < quantity) {
      throw new Error(`Insufficient resource inventory: only ${unreservedQty} available.`);
    }

    // 2. Revalidate Demand Request
    const demand = await tx.demandRequest.findUnique({ where: { id: demandId } });
    if (!demand) throw new Error('Demand request not found.');
    if (demand.status === DemandStatus.FULFILLED || demand.status === DemandStatus.CANCELLED) {
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
        status: AllocationStatus.RECOMMENDED,
        approvedById: officerId,
      },
    });

    // 4. Update Resource quantity (reserve it)
    await tx.resource.update({
      where: { id: resourceId },
      data: {
        reservedQuantity: { increment: quantity },
        status: resource.availableQuantity - (resource.reservedQuantity + quantity) <= 0
          ? ResourceStatus.RESERVED
          : ResourceStatus.LOW,
      },
    });

    // 5. Update Demand request status
    await tx.demandRequest.update({
      where: { id: demandId },
      data: { status: DemandStatus.MATCHED },
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

  const officerEmail = req.headers['x-officer-email'] as string;
  let officerId: string | null = null;
  if (officerEmail) {
    const officer = await prisma.officer.findUnique({ where: { email: officerEmail } });
    if (!officer) {
      return res.status(403).json({ error: { message: 'Unauthorized: Officer account not found.' } });
    }
    officerId = officer.id;
  }

  const findQuery = isUuid ? { id } : { allocationId: id };

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.allocation.findUnique({
      where: findQuery,
      include: { demand: true, resource: true },
    });

    if (!allocation) throw new Error('Allocation record not found.');
    if (allocation.status === AllocationStatus.APPROVED) {
      throw new Error('Allocation is already approved.');
    }

    // Update allocation record
    const updated = await tx.allocation.update({
      where: { id: allocation.id },
      data: {
        status: AllocationStatus.APPROVED,
        approvedById: officerId,
        approvedAt: new Date(),
      },
    });

    // Transition demand state to ALLOCATED
    await tx.demandRequest.update({
      where: { id: allocation.demandId },
      data: { status: DemandStatus.ALLOCATED },
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

  const officerEmail = req.headers['x-officer-email'] as string;
  let officerId: string | null = null;
  if (officerEmail) {
    const officer = await prisma.officer.findUnique({ where: { email: officerEmail } });
    if (!officer) {
      return res.status(403).json({ error: { message: 'Unauthorized: Officer account not found.' } });
    }
    officerId = officer.id;
  }

  const findQuery = isUuid ? { id } : { allocationId: id };

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.allocation.findUnique({
      where: findQuery,
      include: { demand: true, resource: true },
    });

    if (!allocation) throw new Error('Allocation record not found.');
    if (allocation.status === AllocationStatus.REJECTED) {
      throw new Error('Allocation is already rejected.');
    }

    // Update allocation record
    const updated = await tx.allocation.update({
      where: { id: allocation.id },
      data: {
        status: AllocationStatus.REJECTED,
      },
    });

    // Return quantity to resource available pool (unreserve it)
    await tx.resource.update({
      where: { id: allocation.resourceId },
      data: {
        reservedQuantity: { decrement: allocation.demand.quantity },
        status: ResourceStatus.AVAILABLE,
      },
    });

    // Revert demand state to PENDING
    await tx.demandRequest.update({
      where: { id: allocation.demandId },
      data: { status: DemandStatus.PENDING },
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
async function resForUpdate(tx: any, id: string) {
  // Run raw SQL select to lock the resource record
  const res: any[] = await tx.$queryRaw`
    SELECT "availableQuantity", "reservedQuantity", "status", "unit"
    FROM "Resource"
    WHERE id = ${id}::uuid
    LIMIT 1
    FOR UPDATE
  `;
  return res.length > 0 ? res[0] : null;
}

export { router as allocationsRouter };
