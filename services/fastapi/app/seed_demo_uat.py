import sys
import uuid
from datetime import datetime
from app.core.database import SessionLocal
from app.core.models import IncidentModel, DemandRequestModel, ResourceModel, VehicleModel, AllocationModel, DispatchModel, DeliveryModel, OfficerModel
from app.core.security import hash_password

def seed_uat_data():
    db = SessionLocal()
    try:
        print("[SEED] Seeding SAKSHAM-DEMO-UAT dataset...")

        # 0. Seed Demo Officers
        demo_officers = [
            {
                "email": "operator@saksham.demo",
                "name": "Harshit Sharma",
                "role": "OPERATOR",
                "region": "Delhi NCR",
            },
            {
                "email": "authority@saksham.demo",
                "name": "Pradeep Kumar",
                "role": "REGIONAL_AUTHORITY",
                "region": "East Delhi",
            },
            {
                "email": "admin@saksham.demo",
                "name": "Rajesh Nair",
                "role": "ADMIN",
                "region": "National",
            }
        ]

        for off_data in demo_officers:
            existing = db.query(OfficerModel).filter(OfficerModel.email == off_data["email"]).first()
            if not existing:
                print(f"  -> Creating Demo Officer '{off_data['email']}'...")
                officer = OfficerModel(
                    id=uuid.uuid4(),
                    email=off_data["email"],
                    name=off_data["name"],
                    role=off_data["role"],
                    region=off_data["region"],
                    passwordHash=hash_password("Password@123"),
                    verificationStatus="VERIFIED",
                    accountStatus="ACTIVE"
                )
                db.add(officer)
            else:
                print(f"  -> Demo Officer '{off_data['email']}' already exists.")
        db.commit()

        # 1. Active Supply Depot
        depot_name = "SAKSHAM Demo Delhi Relief Depot"
        depot_resource_id = "RES-DEMO-UAT-001"
        existing_res = db.query(ResourceModel).filter(ResourceModel.resourceId == depot_resource_id).first()
        
        if existing_res:
            print(f"  -> Depot '{depot_name}' already exists, updating inventory.")
            existing_res.availableQuantity = 500.0
            existing_res.reservedQuantity = 0.0
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

        # VEH-DEMO-UAT-002
        v2_id = "VEH-DEMO-UAT-002"
        v2_name = "SAKSHAM Medical Transit Unit"
        existing_v2 = db.query(VehicleModel).filter(VehicleModel.vehicleId == v2_id).first()
        if existing_v2:
            existing_v2.status = "AVAILABLE"
            existing_v2.currentLatitude = 28.6480
            existing_v2.currentLongitude = 77.2120
        else:
            db.add(VehicleModel(
                id=uuid.uuid4(),
                vehicleId=v2_id,
                name=v2_name,
                type="VAN",
                capacity=1500.0,
                capacityUnit="KG",
                currentLatitude=28.6480,
                currentLongitude=77.2120,
                speed=0.0,
                operatorName="Operator Rajesh Kumar",
                contactRadio="Channel 18 / UHF",
                status="AVAILABLE"
            ))

        # VEH-DEMO-UAT-003
        v3_id = "VEH-DEMO-UAT-003"
        v3_name = "SAKSHAM Heavy Supply Carrier"
        existing_v3 = db.query(VehicleModel).filter(VehicleModel.vehicleId == v3_id).first()
        if existing_v3:
            existing_v3.status = "AVAILABLE"
            existing_v3.currentLatitude = 28.6390
            existing_v3.currentLongitude = 77.2210
        else:
            db.add(VehicleModel(
                id=uuid.uuid4(),
                vehicleId=v3_id,
                name=v3_name,
                type="TRUCK",
                capacity=10000.0,
                capacityUnit="L",
                currentLatitude=28.6390,
                currentLongitude=77.2210,
                speed=0.0,
                operatorName="Operator Vijay Singh",
                contactRadio="Channel 22 / VHF",
                status="AVAILABLE"
            ))

        # VEH-DEMO-UAT-004
        v4_id = "VEH-DEMO-UAT-004"
        v4_name = "SAKSHAM Rapid Water Tanker"
        existing_v4 = db.query(VehicleModel).filter(VehicleModel.vehicleId == v4_id).first()
        if existing_v4:
            existing_v4.status = "AVAILABLE"
            existing_v4.currentLatitude = 28.6550
            existing_v4.currentLongitude = 77.2010
        else:
            db.add(VehicleModel(
                id=uuid.uuid4(),
                vehicleId=v4_id,
                name=v4_name,
                type="TANKER",
                capacity=8000.0,
                capacityUnit="L",
                currentLatitude=28.6550,
                currentLongitude=77.2010,
                speed=0.0,
                operatorName="Operator Sunil Verma",
                contactRadio="Channel 24 / VHF",
                status="AVAILABLE"
            ))

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

        # Delete demo vehicles
        db.query(VehicleModel).filter(VehicleModel.vehicleId.in_([
            "VEH-DEMO-UAT-001", "VEH-DEMO-UAT-002", "VEH-DEMO-UAT-003", "VEH-DEMO-UAT-004"
        ])).delete(synchronize_session=False)
        print("  -> Purged Demo Vehicles.")

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
