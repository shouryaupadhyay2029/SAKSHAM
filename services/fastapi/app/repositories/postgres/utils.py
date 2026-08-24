import json
import uuid
from typing import Dict, Any

# Columns in DispatchModel that store JSON as text strings
_JSON_TEXT_COLUMNS = {
    "routeGeometry",
    "routeDecisionFactors",
    "routeAlternatives",
}

def model_to_dict_safe(model_obj) -> Dict[str, Any]:
    if not model_obj:
        return {}
    d = {}
    for column in model_obj.__table__.columns:
        val = getattr(model_obj, column.name)
        if isinstance(val, uuid.UUID):
            d[column.name] = str(val)
        elif column.name in _JSON_TEXT_COLUMNS and isinstance(val, str):
            # Deserialize JSON text back to dict/list for Pydantic validation
            try:
                d[column.name] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                d[column.name] = None
        else:
            d[column.name] = val
    return d
