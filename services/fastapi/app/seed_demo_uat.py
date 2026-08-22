import sys
import uuid
from datetime import datetime
from app.core.database import SessionLocal
from app.core.models import IncidentModel, DemandRequestModel, ResourceModel, VehicleModel, AllocationModel, DispatchModel, DeliveryModel

def seed_uat_data():
    db = SessionLocal()
    try:
        print("[SEED] Seeding SAKSHAM-DEMO-UAT dataset...")

        # 1. Active Supply Depot
        depot_name = "SAKSHAM Demo Delhi Relief Depot"
        depot_resource_id = "RES-DEMO-UAT-001"
        existing_res = db.query(ResourceModel).filter(ResourceModel.resourceId == depot_resource_id).first()
        
        if existing_res:
            print(f"  -> Depot '{depot_name}' already exists, updating inventory.")
            existing_res.availableQuantity = 500.0
            existing_res.status = "AVAILABLE"
            existing_res.latitude = 28.6761
            existing_res.longitude = 77.3204
            existing_res.location = "Dilshad Garden Metro Station, Delhi, India"
            db_res = existing_res
        else:
            print(f"  -> Creating Depot '{depot_name}'...")
            db_res = ResourceModel(
                id=uuid.uuid4(),
                resourceId=depot_resource_id,
                materialName="WATER",
                description="SAKSHAM-DEMO-UAT emergency drinking water stocks",
                category="WATER",
                availableQuantity=500.0,
                reservedQuantity=0.0,
                unit="L",
                storageDepot=depot_name,
                location="Dilshad Garden Metro Station, Delhi, India",
                latitude=28.6761,
                longitude=77.3204,
                status="AVAILABLE",
                pointOfContact="Depot Manager Vikram (+91 99999 11111)"
            )
            db.add(db_res)
        
        # 2. Dispatchable Vehicle
        vehicle_id = "VEH-DEMO-UAT-001"
        vehicle_name = "SAKSHAM Demo Rescue Truck"
        existing_veh = db.query(VehicleModel).filter(VehicleModel.vehicleId == vehicle_id).first()
        
        if existing_veh:
            print(f"  -> Vehicle '{vehicle_name}' already exists, resetting status.")
            existing_veh.status = "AVAILABLE"
            existing_veh.currentLatitude = 28.6439
            existing_veh.currentLongitude = 77.2090
            db_veh = existing_veh
        else:
            print(f"  -> Creating Vehicle '{vehicle_name}'...")
            db_veh = VehicleModel(
                id=uuid.uuid4(),
                vehicleId=vehicle_id,
                name=vehicle_name,
                type="TRUCK",
                capacity=5000.0,
                capacityUnit="L",
                currentLatitude=28.6439,
                currentLongitude=77.2090,
                speed=0.0,
                operatorName="Demo Operator",
                contactRadio="Channel 16 / UHF",
                status="AVAILABLE"
            )
            db.add(db_veh)

        # 3. Incident
        incident_ref = "INC-DEMO-UAT-001"
        existing_inc = db.query(IncidentModel).filter(IncidentModel.incidentId == incident_ref).first()
        
        # Clean up any existing demands/allocations/dispatches tied to this demo incident to ensure a clean slate
        if existing_inc:
            print(f"  -> Cleaning slate for existing demo incident '{incident_ref}'...")
            demands = db.query(DemandRequestModel).filter(DemandRequestModel.incidentId == existing_inc.id).all()
            for dem in demands:
                allocs = db.query(AllocationModel).filter(AllocationModel.demandId == dem.id).all()
                for alc in allocs:
                    db.query(DispatchModel).filter(DispatchModel.allocationId == alc.id).delete()
                db.query(AllocationModel).filter(AllocationModel.demandId == dem.id).delete()
            db.query(DemandRequestModel).filter(DemandRequestModel.incidentId == existing_inc.id).delete()
            db.query(IncidentModel).filter(IncidentModel.incidentId == incident_ref).delete()
            db.commit()

        print(f"  -> Creating Incident '{incident_ref}'...")
        db_inc = IncidentModel(
            id=uuid.uuid4(),
            incidentId=incident_ref,
            type="FIRE",
            title="SAKSHAM-DEMO-UAT Fire Emergency",
            description="Emergency warehouse fire reporting stranded civilians, need immediate water supply.",
            location="Sahadev Street, Vivek Vihar, Delhi, India",
            latitude=28.6657,
            longitude=77.2968,
            region="EAST DELHI",
            severity="HIGH",
            status="REPORTED",
            affectedPeople=35,
            displacedPeople=5,
            assignedUnit=None
        )
        db.add(db_inc)
        db.commit()
        db.refresh(db_inc)

        # 4. Demand Linked to Incident
        demand_ref = "DEM-DEMO-UAT-001"
        print(f"  -> Creating Demand '{demand_ref}'...")
        db_dem = DemandRequestModel(
            id=uuid.uuid4(),
            requestId=demand_ref,
            incidentId=db_inc.id,
            affectedZone="East Delhi",
            requestedType="WATER",
            description="Emergency drinking water for fire disaster victims",
            quantity=100.0,
            unit="L",
            affectedPeople=35,
            priority="HIGH",
            status="PENDING"
        )
        db.add(db_dem)
        db.commit()

        print("[SUCCESS] SAKSHAM-DEMO-UAT dataset successfully seeded!")
        print(f"  Depot ID:    {db_res.resourceId} (Dilshad Garden Metro Station)")
        print(f"  Vehicle ID:  {db_veh.vehicleId} (Connaught Place)")
        print(f"  Incident ID: {db_inc.incidentId} (Sahadev Street, Vivek Vihar)")
        print(f"  Demand ID:   {db_dem.requestId} (WATER - 100 L)")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
    finally:
        db.close()

def clear_uat_data():
    db = SessionLocal()
    try:
        print("[CLEAR] Purging SAKSHAM-DEMO-UAT dataset...")
        
        # Delete demo incident and cascade deletions
        inc = db.query(IncidentModel).filter(IncidentModel.incidentId == "INC-DEMO-UAT-001").first()
        if inc:
            demands = db.query(DemandRequestModel).filter(DemandRequestModel.incidentId == inc.id).all()
            for dem in demands:
                allocs = db.query(AllocationModel).filter(AllocationModel.demandId == dem.id).all()
                for alc in allocs:
                    db.query(DispatchModel).filter(DispatchModel.allocationId == alc.id).delete()
                db.query(AllocationModel).filter(AllocationModel.demandId == dem.id).delete()
            db.query(DemandRequestModel).filter(DemandRequestModel.incidentId == inc.id).delete()
            db.query(IncidentModel).filter(IncidentModel.id == inc.id).delete()
            print("  -> Purged Demo Incident and associated demands/allocations/dispatches.")

        # Delete demo resource depot
        db.query(ResourceModel).filter(ResourceModel.resourceId == "RES-DEMO-UAT-001").delete()
        print("  -> Purged Demo Resource Depot.")

        # Delete demo vehicle
        db.query(VehicleModel).filter(VehicleModel.vehicleId == "VEH-DEMO-UAT-001").delete()
        print("  -> Purged Demo Vehicle.")

        db.commit()
        print("[SUCCESS] SAKSHAM-DEMO-UAT dataset successfully purged!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Purge failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.seed_demo_uat [seed|clear]")
        sys.exit(1)
        
    cmd = sys.argv[1].lower()
    if cmd == "seed":
        seed_uat_data()
    elif cmd == "clear":
        clear_uat_data()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
