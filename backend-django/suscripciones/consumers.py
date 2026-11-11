import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .services import MembershipService


class GrupoNotificationConsumer(AsyncWebsocketConsumer):
    """Clases 9 y 10: canal de avisos y presencia de un grupo."""

    async def connect(self):
        self.grupo_id = self.scope["url_route"]["kwargs"]["grupo_id"]
        self.group_name = f"grupo_{self.grupo_id}"
        self.user = self.scope["user"]

        # Solo usuarios autenticados y miembros del grupo
        if not self.user.is_authenticated:
            await self.close()
            return

        es_miembro = await database_sync_to_async(MembershipService.is_member)(self.user, self.grupo_id)
        if not es_miembro:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        self.joined = True
        await self._avisar_presencia("online")

    async def disconnect(self, close_code):
        # Si la conexión fue rechazada en connect, nunca entró al grupo
        if not getattr(self, "joined", False):
            return
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        await self._avisar_presencia("offline")

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "")
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"error": "El mensaje debe ser JSON."}))
            return
        await self.send(text_data=json.dumps({"echo": data}))

    async def _avisar_presencia(self, estado):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "presence_update",
                "payload": {"event": "presencia", "user": self.user.alias, "status": estado},
            },
        )

    async def grupo_notification(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps(event["payload"]))
