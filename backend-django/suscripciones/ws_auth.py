"""Clase 10: los navegadores no pueden mandar headers al abrir un WebSocket, el token va en ?token=."""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

from .autenticacion import usuario_desde_token


@database_sync_to_async
def get_user_from_token(token):
    return usuario_desde_token(token) or AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Lee ?token=<access> de la URL del WebSocket y completa scope["user"]."""

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token = query.get("token", [None])[0]
        scope["user"] = await get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
