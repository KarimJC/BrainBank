from typing import Dict
from fastapi import WebSocket

"""
The purpose of this class ConnectionManager is to keep track of who is online and to make sure that messages are sent to the right person.
Below is an example:

user_id 55 connects, the connection will map their id of 55 to a websocket.
user_id 56 connects, the connection will map their id of 56 to a websocket.
user_id 56 sends a message to user_id 55, the send_message will look up id 55 
and then send the text. The connection manager is purely for storage purposes only 
and does not have any knowledge of what messages are being sent or who is sending them.
"""


class ConnectionManager:
    def __init__(self):
        # user_id maps to websocket
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections.update({user_id: websocket})

    async def disconnect(self, user_id: int):
        if self.active_connections.get(user_id):
            self.active_connections.pop(user_id)

    async def send_message(self, user_id: int, message: str):
        if self.active_connections.get(user_id):
            await self.active_connections[user_id].send_text(message)
