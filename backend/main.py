from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.shape import to_shape
from geoalchemy2.elements import WKTElement

from database import get_db
from models import Resource
from schemas import ResourceCreate, ResourceOut

app = FastAPI(title="Disaster Relief Platform API")

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Helper: convert a Resource DB row into API-friendly output (extracts lat/lng from geometry)
def resource_to_out(r: Resource) -> dict:
    point = to_shape(r.location)
    return {
        "id": r.id,
        "name": r.name,
        "resource_type": r.resource_type,
        "capacity": r.capacity,
        "status": r.status,
        "agency_name": r.agency_name,
        "latitude": point.y,
        "longitude": point.x,
    }

@app.post("/resources", response_model=ResourceOut)
def create_resource(resource: ResourceCreate, db: Session = Depends(get_db)):
    point = WKTElement(f"POINT({resource.longitude} {resource.latitude})", srid=4326)
    db_resource = Resource(
        name=resource.name,
        resource_type=resource.resource_type,
        capacity=resource.capacity,
        status=resource.status,
        agency_name=resource.agency_name,
        location=point,
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return resource_to_out(db_resource)

@app.get("/resources", response_model=list[ResourceOut])
def list_resources(db: Session = Depends(get_db)):
    resources = db.query(Resource).all()
    return [resource_to_out(r) for r in resources]

@app.get("/resources/nearby", response_model=list[ResourceOut])
def nearby_resources(lat: float, lng: float, radius_km: float = 5, db: Session = Depends(get_db)):
    point = WKTElement(f"POINT({lng} {lat})", srid=4326)
    radius_m = radius_km * 1000
    resources = (
        db.query(Resource)
        .filter(func.ST_DWithin(Resource.location.cast(Resource.location.type), point, radius_m, True))
        .all()
    )
    return [resource_to_out(r) for r in resources]