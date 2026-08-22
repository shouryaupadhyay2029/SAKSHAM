from typing import Any, Dict, Tuple

def get_value(obj: Any, key: str, default: Any = None) -> Any:
    """Safely retrieves value from dictionary or object attribute."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

def normalize_demand(db_demand: Any) -> Dict[str, Any]:
    """
    Normalizes a SAKSHAM database DemandRequest record.
    Supports dictionary input or SQLAlchemy object models.
    """
    demand_id = get_value(db_demand, "id") or get_value(db_demand, "requestId")
    requested_type = get_value(db_demand, "requestedType")
    priority_val = str(get_value(db_demand, "priority", "HIGH")).upper()
    
    # Priority mapping: lower score is higher routing urgency/importance
    severity_map = {
        "CRITICAL": 1.0,
        "HIGH": 2.0,
        "MEDIUM": 3.0,
        "LOW": 4.0
    }
    severity_score = severity_map.get(priority_val, 2.0)
    people_affected = int(get_value(db_demand, "affectedPeople", 0))

    # Safely extract coordinates from nested incident relation if present, or default
    incident = get_value(db_demand, "incident")
    lat = 28.6139
    lng = 77.2090
    if incident:
        lat = get_value(incident, "latitude", lat)
        lng = get_value(incident, "longitude", lng)
    else:
        # Check if coordinates exist directly on demand record
        lat = get_value(db_demand, "latitude", lat)
        lng = get_value(db_demand, "longitude", lng)

    return {
        "id": str(demand_id),
        "location": (float(lat), float(lng)),
        "resource_type": str(requested_type),
        "severity": severity_score,
        "people_affected": people_affected,
        "quantity": float(get_value(db_demand, "quantity", 0.0)),
        "unit": str(get_value(db_demand, "unit", "Units"))
    }

def normalize_vehicle(db_vehicle: Any) -> Dict[str, Any]:
    """
    Normalizes a SAKSHAM database Vehicle record.
    Supports dictionary input or SQLAlchemy object models.
    """
    vehicle_id = get_value(db_vehicle, "id") or get_value(db_vehicle, "vehicleId")
    
    # Safely extract numeric capacity
    raw_capacity = get_value(db_vehicle, "capacity", 0.0)
    if isinstance(raw_capacity, str):
        try:
            capacity = float(raw_capacity.split()[0])
        except Exception:
            capacity = 1000.0  # Safe fallback capacity
    else:
        capacity = float(raw_capacity or 1000.0)

    lat = float(get_value(db_vehicle, "currentLatitude", 28.6139))
    lng = float(get_value(db_vehicle, "currentLongitude", 77.2090))

    return {
        "id": str(vehicle_id),
        "capacity": int(capacity),
        "depot_location": (lat, lng),
        "status": str(get_value(db_vehicle, "status", "AVAILABLE")).upper()
    }

def normalize_resource(db_resource: Any) -> Dict[str, Any]:
    """
    Normalizes a SAKSHAM database Resource record.
    Supports dictionary input or SQLAlchemy object models.
    """
    res_id = get_value(db_resource, "id") or get_value(db_resource, "resourceId")
    lat = float(get_value(db_resource, "latitude", 28.6139))
    lng = float(get_value(db_resource, "longitude", 77.2090))
    category = get_value(db_resource, "category", "")
    quantity = float(get_value(db_resource, "availableQuantity", 0.0))
    unit = get_value(db_resource, "unit", "Units")

    return {
        "id": str(res_id),
        "location": (lat, lng),
        "category": str(category),
        "quantity": quantity,
        "unit": str(unit),
        "status": str(get_value(db_resource, "status", "AVAILABLE")).upper()
    }
