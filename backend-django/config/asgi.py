"""
Punto de entrada ASGI (Clase 9): HTTP lo atiende Django y WebSocket lo atiende Channels.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Tiene que ejecutarse antes de importar código que use modelos
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

import suscripciones.routing  # noqa: E402
from suscripciones.ws_auth import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        JWTAuthMiddleware(
            URLRouter(suscripciones.routing.websocket_urlpatterns)
        )
    ),
})
