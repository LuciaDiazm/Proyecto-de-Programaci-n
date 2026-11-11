from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/grupos/(?P<grupo_id>\d+)/$", consumers.GrupoNotificationConsumer.as_asgi()),
]
