from typing import Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        #user_id maps to websocket 
        self.active_connections: Dict[int, WebSocket] = {}
        
        
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections.update({user_id:websocket})
        
        
    async def disconnect(self,user_id: int):
        if self.active_connections.get(user_id):
            self.active_connections.pop(user_id)
        
    async def send_message(self, user_id:int, message:str):
        if self.active_connections.get(user_id):
            await self.active_connections[user_id].send_text(message)