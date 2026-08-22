from typing import Set

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def send_to_client(self, websocket: WebSocket, event: dict):
        try:
            await websocket.send_json(event)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, event: dict):
        disconnected = []

        for websocket in self.active_connections.copy():
            try:
                await websocket.send_json(event)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(websocket)


connection_manager = ConnectionManager()
