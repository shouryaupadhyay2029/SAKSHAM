import traceback
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.models import IncidentModel
from app.schemas.incident import IncidentUpdate, IncidentStatus
from app.schemas.common import Severity
from app.domain.incidents.service import IncidentService
from app.repositories.postgres.incident_repository import SqlAlchemyIncidentRepository

def test():
    db = SessionLocal()
    try:
        inc = db.query(IncidentModel).filter(IncidentModel.incidentId == "INC-2026-001").first()
        if not inc:
            print("Incident INC-2026-001 not found!")
            return
        
        print(f"Current Incident: {inc.incidentId}, Status={inc.status}, Severity={inc.severity}")
        
        repo = SqlAlchemyIncidentRepository(db)
        service = IncidentService(repo)
        
        update_data = IncidentUpdate(
            severity=Severity.CRITICAL,
            status=IncidentStatus.AWAITING_MATCH
        )
        
        print("Executing update_incident in service...")
        updated = service.update_incident(str(inc.id), update_data)
        print("Success! Updated:", updated)
        
    except Exception as e:
        print("EXCEPTION OCCURRED:")
        print(e)
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test()
