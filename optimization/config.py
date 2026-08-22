import os

# Routing Configuration
# If true, the system will fall back to Haversine/straight-line calculations if OSRM is unreachable
ALLOW_DEV_FALLBACK = True

# Explicitly configure OSRM endpoint
# Production execution will require this value to be defined
OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "http://router.project-osrm.org")

# Ensure production checks
IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"

if IS_PRODUCTION and not os.getenv("OSRM_BASE_URL"):
    raise RuntimeError("Production routing requires an explicitly configured 'OSRM_BASE_URL' environment variable.")
