import uuid
from typing import Dict, Any

def model_to_dict_safe(model_obj) -> Dict[str, Any]:
    if not model_obj:
        return {}
    d = {}
    for column in model_obj.__table__.columns:
        val = getattr(model_obj, column.name)
        if isinstance(val, uuid.UUID):
            d[column.name] = str(val)
        else:
            d[column.name] = val
    return d
