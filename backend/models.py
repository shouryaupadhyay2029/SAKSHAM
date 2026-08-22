from sqlalchemy import Column, Integer, String, Float, DateTime
from geoalchemy2 import Geometry
from datetime import datetime
from database import Base

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)   # shelter, food, water, medicine, rescue_team, vehicle
    capacity = Column(Integer, nullable=True)         # e.g. how many people a shelter holds
    status = Column(String, default="available")      # available, deployed, depleted
    agency_name = Column(String, nullable=True)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow)