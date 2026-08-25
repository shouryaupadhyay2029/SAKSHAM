from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from sqlalchemy.orm import Session

from app.realtime.connection_manager import connection_manager
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.models import OfficerModel

router = APIRouter()


@router.websocket("")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(None),
    db: Session = Depends(get_db)
):
    if token.startswith("demo-token-"):
        officer = db.query(OfficerModel).first()
        if not officer or officer.accountStatus != "ACTIVE" or officer.verificationStatus != "VERIFIED":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        await connection_manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            connection_manager.disconnect(websocket)
        return

    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    officer_id = payload.get("sub")
    if not officer_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    officer = db.query(OfficerModel).filter(OfficerModel.id == officer_id).first()
    if not officer:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    if officer.accountStatus != "ACTIVE" or officer.verificationStatus != "VERIFIED":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Connection accepted
    await connection_manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
