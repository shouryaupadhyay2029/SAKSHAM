"""
conftest.py -- SAKSHAM Test Suite Session Fixtures
===================================================
Seeds legacy test data (with well-known IDs) that the various
integration test files depend on. All data is created once at
session start and removed at session end.

IDs seeded here:
  INC-2026-999    -- Primary incident used by test_incidents.py
  RES-MD-001      -- Medical depot used by test_allocations/dispatch
  RES-WTR-001     -- Water depot used by test_matching (REQ-DEL-101 is WATER)
  REQ-DEL-101     -- WATER demand used by test_matching
  REQ-DEL-102     -- MEDICAL demand used by test_allocations/dispatch
  VEH-TR-102      -- Vehicle used by test_dispatch_execution/delivery
  ALL-2026-001    -- Allocation linking REQ-DEL-102 + RES-MD-001
"""

import uuid
import datetime
import pytest

from app.core.database import SessionLocal
from app.core.models import (
    IncidentModel,
    DemandRequestModel,
    ResourceModel,
    VehicleModel,
    AllocationModel,
    OfficerModel,
)
from app.core.security import hash_password


# ---------------------------------------------------------------------------
# Helper: ensure demo officers exist (Password@123)
# ---------------------------------------------------------------------------
def _ensure_officers(db):
    demo_officers = [
        {"email": "operator@saksham.demo",  "name": "Harshit Sharma",  "role": "OPERATOR",           "region": "Delhi NCR"},
        {"email": "authority@saksham.demo", "name": "Pradeep Kumar",   "role": "REGIONAL_AUTHORITY", "region": "East Delhi"},
        {"email": "admin@saksham.demo",     "name": "Rajesh Nair",     "role": "ADMIN",              "region": "National"},
    ]
    for off in demo_officers:
        if not db.query(OfficerModel).filter(OfficerModel.email == off["email"]).first():
            db.add(OfficerModel(
                id=uuid.uuid4(),
                email=off["email"],
                name=off["name"],
                role=off["role"],
                region=off["region"],
                passwordHash=hash_password("Password@123"),
                verificationStatus="VERIFIED",
                accountStatus="ACTIVE",
            ))
    db.commit()


# ---------------------------------------------------------------------------
# Session-scoped fixture: seeds & tears down legacy test IDs
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def legacy_seed():
    """
    Seed all legacy IDs required by the integration test suite.
    Runs once before all tests; cleans up after.
    """
    db = SessionLocal()
    try:
        _ensure_officers(db)

        # -- INC-2026-999 (used by test_incidents.py) -------------------------
        if not db.query(IncidentModel).filter(IncidentModel.incidentId == "INC-2026-999").first():
            db.add(IncidentModel(
                id=uuid.uuid4(),
                incidentId="INC-2026-999",
                type="FLOOD",
                title="Yamuna Bank Flooding - Regression Seed",
                description="Seed incident for regression test suite.",
                location="Yamuna Banks, East Delhi",
                latitude=28.6139,
                longitude=77.2090,
                region="EAST DELHI",
                severity="HIGH",
                status="REPORTED",
                affectedPeople=200,
                displacedPeople=40,
                assignedUnit=None,
            ))

        # -- RES-MD-001 (MEDICAL depot for test_allocations/dispatch) ----------
        if not db.query(ResourceModel).filter(ResourceModel.resourceId == "RES-MD-001").first():
            db.add(ResourceModel(
                id=uuid.uuid4(),
                resourceId="RES-MD-001",
                materialName="MEDICAL_KITS",
                description="Seed medical kits depot for integration tests.",
                category="MEDICAL",
                availableQuantity=200.0,
                reservedQuantity=0.0,
                unit="Kits",
                storageDepot="SAKSHAM Medical Depot Alpha",
                location="Connaught Place, Delhi, India",
                latitude=28.6304,
                longitude=77.2177,
                status="AVAILABLE",
                pointOfContact="Depot Lead (+91 99999 22222)",
            ))

        # -- RES-WTR-001 (WATER depot for test_matching.py REQ-DEL-101) --------
        if not db.query(ResourceModel).filter(ResourceModel.resourceId == "RES-WTR-001").first():
            db.add(ResourceModel(
                id=uuid.uuid4(),
                resourceId="RES-WTR-001",
                materialName="WATER",
                description="Seed water depot for matching test.",
                category="WATER",
                availableQuantity=500.0,
                reservedQuantity=0.0,
                unit="L",
                storageDepot="SAKSHAM Water Depot East",
                location="Dilshad Garden Metro Station, Delhi, India",
                latitude=28.6761,
                longitude=77.3204,
                status="AVAILABLE",
                pointOfContact="Water Depot Manager (+91 99999 33333)",
            ))

        db.commit()

        # -- REQ-DEL-101 (WATER demand for test_matching.py) ------------------
        inc_081 = db.query(IncidentModel).filter(IncidentModel.incidentId == "INC-2026-999").first()
        if not db.query(DemandRequestModel).filter(DemandRequestModel.requestId == "REQ-DEL-101").first():
            db.add(DemandRequestModel(
                id=uuid.uuid4(),
                requestId="REQ-DEL-101",
                incidentId=inc_081.id,
                affectedZone="East Delhi",
                requestedType="WATER",
                description="Seed water demand for matching recommendation test.",
                quantity=100.0,
                unit="L",
                affectedPeople=100,
                priority="HIGH",
                status="PENDING",
            ))

        # -- REQ-DEL-102 (MEDICAL demand for test_allocations/dispatch) --------
        if not db.query(DemandRequestModel).filter(DemandRequestModel.requestId == "REQ-DEL-102").first():
            db.add(DemandRequestModel(
                id=uuid.uuid4(),
                requestId="REQ-DEL-102",
                incidentId=inc_081.id,
                affectedZone="East Delhi",
                requestedType="MEDICAL",
                description="Seed medical demand for allocation/dispatch workflow test.",
                quantity=50.0,
                unit="Kits",
                affectedPeople=80,
                priority="HIGH",
                status="PENDING",
            ))

        db.commit()

        # -- VEH-TR-102 (vehicle for dispatch execution / delivery) -----------
        if not db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").first():
            db.add(VehicleModel(
                id=uuid.uuid4(),
                vehicleId="VEH-TR-102",
                name="Heavy Duty Cargo Truck B",
                type="TRUCK",
                capacity=5000.0,
                capacityUnit="KG",
                currentLatitude=28.6200,
                currentLongitude=77.2100,
                speed=0.0,
                operatorName="Driver Ravi Kumar",
                contactRadio="Channel 16 / UHF",
                status="AVAILABLE",
            ))

        db.commit()

        # -- ALL-2026-001 (APPROVED allocation: REQ-DEL-102 <-> RES-MD-001) --
        req_102 = db.query(DemandRequestModel).filter(DemandRequestModel.requestId == "REQ-DEL-102").first()
        res_md1 = db.query(ResourceModel).filter(ResourceModel.resourceId == "RES-MD-001").first()
        if not db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").first():
            db.add(AllocationModel(
                id=uuid.uuid4(),
                allocationId="ALL-2026-001",
                demandId=req_102.id,
                resourceId=res_md1.id,
                status="APPROVED",
                approvedAt=datetime.datetime.now(datetime.UTC),
            ))

        db.commit()
        print("\n[conftest] [OK] Legacy test data seeded successfully.")

    except Exception as exc:
        db.rollback()
        print(f"\n[conftest] [FAIL] Seed failed: {exc}")
        raise
    finally:
        db.close()

    # -- Yield: tests run here ------------------------------------------------
    yield

    # -- Teardown: remove seeded data in FK-safe order -----------------------
    db = SessionLocal()
    try:
        db.query(AllocationModel).filter(AllocationModel.allocationId == "ALL-2026-001").delete()
        db.query(DemandRequestModel).filter(
            DemandRequestModel.requestId.in_(["REQ-DEL-101", "REQ-DEL-102"])
        ).delete(synchronize_session=False)
        db.query(IncidentModel).filter(IncidentModel.incidentId == "INC-2026-999").delete()
        db.query(ResourceModel).filter(
            ResourceModel.resourceId.in_(["RES-MD-001", "RES-WTR-001"])
        ).delete(synchronize_session=False)
        db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-TR-102").delete()
        db.commit()
        print("\n[conftest] [OK] Legacy test data cleaned up.")
    except Exception as exc:
        db.rollback()
        print(f"\n[conftest] [FAIL] Teardown failed: {exc}")
    finally:
        db.close()
