import sys
import os
import uuid

# Add current folder to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal
from app.core.models import (
    IncidentModel, DemandRequestModel, ResourceModel, VehicleModel, 
    AllocationModel, DispatchModel, DeliveryModel, OfficerModel
)
from app.seed_demo_uat import seed_uat_data

def purge_all_except_core():
    db = SessionLocal()
    try:
        print("[PURGE] Beginning database purge to clear all non-essential test data...")
        
        # 1. Delete transactional records
        print("  -> Deleting all Deliveries...")
        db.query(DeliveryModel).delete()
        
        print("  -> Deleting all Dispatches...")
        db.query(DispatchModel).delete()
        
        print("  -> Deleting all Allocations...")
        db.query(AllocationModel).delete()
        
        print("  -> Deleting all Demand Requests...")
        db.query(DemandRequestModel).delete()
        
        print("  -> Deleting all Incidents...")
        db.query(IncidentModel).delete()
        
        # 2. Delete static assets to ensure clean seed
        print("  -> Deleting all Resource Depots...")
        db.query(ResourceModel).delete()
        
        print("  -> Deleting all Logistics Vehicles...")
        db.query(VehicleModel).delete()
        
        db.commit()
        print("[SUCCESS] All old test/demo incidents and transactional data successfully purged!")
        
        # 3. Seed pristine UAT environment
        seed_uat_data()
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Purge failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    purge_all_except_core()
