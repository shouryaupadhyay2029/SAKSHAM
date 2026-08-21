import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class OfficerModel(Base):
    __tablename__ = "Officer"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False) # e.g. "OPERATOR", "REGIONAL_AUTHORITY", "ADMIN"
    region = Column(String, nullable=True)
    passwordHash = Column(String, nullable=False, server_default="")
    verificationStatus = Column(String, nullable=False, server_default="VERIFIED")
    accountStatus = Column(String, nullable=False, server_default="ACTIVE")
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class IncidentModel(Base):
    __tablename__ = "Incident"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incidentId = Column(String, unique=True, nullable=False, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    region = Column(String, nullable=False)
    severity = Column(String, nullable=False) # e.g. CRITICAL, HIGH, etc.
    status = Column(String, nullable=False, default="REPORTED") # e.g. REPORTED, VERIFIED
    reportedAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    affectedPeople = Column(Integer, nullable=False, default=0)
    displacedPeople = Column(Integer, nullable=False, default=0)
    assignedUnit = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    demands = relationship("DemandRequestModel", back_populates="incident", cascade="all, delete-orphan")

class DemandRequestModel(Base):
    __tablename__ = "DemandRequest"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requestId = Column(String, unique=True, nullable=False, index=True)
    incidentId = Column(UUID(as_uuid=True), ForeignKey("Incident.id", ondelete="CASCADE"), nullable=False)
    affectedZone = Column(String, nullable=False)
    requestedType = Column(String, nullable=False)
    description = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    affectedPeople = Column(Integer, nullable=False, default=0)
    priority = Column(String, nullable=False) # e.g. CRITICAL, HIGH, etc.
    status = Column(String, nullable=False, default="PENDING")
    requiredBy = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    incident = relationship("IncidentModel", back_populates="demands")
    allocations = relationship("AllocationModel", back_populates="demand", cascade="all, delete-orphan")

class ResourceModel(Base):
    __tablename__ = "Resource"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resourceId = Column(String, unique=True, nullable=False, index=True)
    materialName = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    availableQuantity = Column(Float, nullable=False)
    reservedQuantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False)
    storageDepot = Column(String, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="AVAILABLE")
    pointOfContact = Column(String, nullable=False)
    lastUpdated = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    allocations = relationship("AllocationModel", back_populates="resource")

class VehicleModel(Base):
    __tablename__ = "Vehicle"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicleId = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    capacity = Column(Float, nullable=False)
    capacityUnit = Column(String, nullable=False)
    currentLatitude = Column(Float, nullable=False)
    currentLongitude = Column(Float, nullable=False)
    speed = Column(Float, nullable=False, default=0.0)
    operatorName = Column(String, nullable=False)
    contactRadio = Column(String, nullable=False)
    currentMission = Column(String, nullable=True)
    status = Column(String, nullable=False, default="AVAILABLE")
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    allocations = relationship("AllocationModel", back_populates="vehicle")
    dispatches = relationship("DispatchModel", back_populates="vehicle")

class AllocationModel(Base):
    __tablename__ = "Allocation"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    allocationId = Column(String, unique=True, nullable=False, index=True)
    demandId = Column(UUID(as_uuid=True), ForeignKey("DemandRequest.id", ondelete="CASCADE"), nullable=False)
    resourceId = Column(UUID(as_uuid=True), ForeignKey("Resource.id", ondelete="CASCADE"), nullable=False)
    vehicleId = Column(UUID(as_uuid=True), ForeignKey("Vehicle.id", ondelete="SET NULL"), nullable=True)
    matchScore = Column(Float, nullable=False, default=1.0)
    availabilityScore = Column(Float, nullable=False, default=1.0)
    distanceScore = Column(Float, nullable=False, default=1.0)
    priorityScore = Column(Float, nullable=False, default=1.0)
    compatibilityScore = Column(Float, nullable=False, default=1.0)
    status = Column(String, nullable=False, default="RECOMMENDED") # e.g. APPROVED, DISPATCHED, etc.
    approvedById = Column(UUID(as_uuid=True), ForeignKey("Officer.id", ondelete="SET NULL"), nullable=True)
    approvedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    demand = relationship("DemandRequestModel", back_populates="allocations")
    resource = relationship("ResourceModel", back_populates="allocations")
    vehicle = relationship("VehicleModel", back_populates="allocations")
    dispatches = relationship("DispatchModel", back_populates="allocation", cascade="all, delete-orphan")

class DispatchModel(Base):
    __tablename__ = "Dispatch"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispatchId = Column(String, unique=True, nullable=False, index=True)
    allocationId = Column(UUID(as_uuid=True), ForeignKey("Allocation.id", ondelete="CASCADE"), nullable=False)
    vehicleId = Column(UUID(as_uuid=True), ForeignKey("Vehicle.id", ondelete="CASCADE"), nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    assignedOfficer = Column(String, nullable=True)
    assignedOfficerId = Column(UUID(as_uuid=True), ForeignKey("Officer.id", ondelete="SET NULL"), nullable=True)
    plannedDeparture = Column(DateTime, nullable=True)
    actualDeparture = Column(DateTime, nullable=True)
    estimatedArrival = Column(DateTime, nullable=True)
    actualArrival = Column(DateTime, nullable=True)
    completionTime = Column(DateTime, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    quantity = Column(Float, nullable=True)
    priority = Column(String, nullable=True)
    status = Column(String, nullable=False, default="PLANNED") # e.g. PLANNED, READY, DISPATCHED, etc.
    notes = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    allocation = relationship("AllocationModel", back_populates="dispatches")
    vehicle = relationship("VehicleModel", back_populates="dispatches")
    deliveries = relationship("DeliveryModel", back_populates="dispatch", cascade="all, delete-orphan")

class DeliveryModel(Base):
    __tablename__ = "Delivery"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deliveryId = Column(String, unique=True, nullable=False, index=True)
    dispatchId = Column(UUID(as_uuid=True), ForeignKey("Dispatch.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    deliveredAt = Column(DateTime, nullable=True)
    receivedBy = Column(String, nullable=True)
    confirmation = Column(String, nullable=True)
    status = Column(String, nullable=False, default="PENDING")
    notes = Column(String, nullable=True)
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    dispatch = relationship("DispatchModel", back_populates="deliveries")

class ShelterModel(Base):
    __tablename__ = "Shelter"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shelterId = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    region = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    totalCapacity = Column(Integer, nullable=False)
    currentOccupancy = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="OPEN") # e.g. OPEN, NEAR_CAPACITY, FULL, CLOSED
    facilities = Column(ARRAY(String), nullable=False, default=list)
    contactPerson = Column(String, nullable=False)
    contactInfo = Column(String, nullable=False)
    createdAt = Column(DateTime, nullable=False, default=datetime.utcnow)
    updatedAt = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
