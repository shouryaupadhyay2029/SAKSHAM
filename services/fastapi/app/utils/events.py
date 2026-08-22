import logging
from typing import Dict, Any

logger = logging.getLogger("saksham.events")

class EventPublisher:
    @staticmethod
    def publish(event_type: str, data: Dict[str, Any]):
        logger.info(f"[EVENT PUBLISHED] Type: {event_type} | Data: {data}")
        # Hook for future WebSocket server / MQTT subscriber integration
