from .connection_manager import ConnectionManager
from .events import RealtimeEvent


class EventPublisher:
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager

    async def publish(self, event: RealtimeEvent):
        event_data = event.model_dump(mode="json")
        await self.connection_manager.broadcast(event_data)
