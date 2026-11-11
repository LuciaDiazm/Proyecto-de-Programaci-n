from datetime import datetime, timedelta, timezone

import jwt
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from suscripciones.models import Grupo, MembresiaGrupo
from suscripciones.services import HolidayService

JWT_DE_PRUEBA = "clave-de-prueba-compartida-con-node-0123456789"

USUARIO_A = "65f1a0000000000000000001"
USUARIO_B = "65f1a0000000000000000002"
USUARIO_C = "65f1a0000000000000000003"


def generar_token(usuario_id, rol="USUARIO", vencido=False, clave=None, nombre="Prueba"):
    """Arma un token igual al que firma la API de Node."""
    expira = datetime.now(timezone.utc) + (timedelta(hours=-1) if vencido else timedelta(hours=1))
    payload = {"id": usuario_id, "rol": rol, "nombre": nombre, "exp": expira, "iss": "aldia-auth"}
    return jwt.encode(payload, clave or JWT_DE_PRUEBA, algorithm="HS256")


@pytest.fixture(autouse=True)
def entorno_de_test(settings, monkeypatch):
    # Sin Redis: el channel layer vive en memoria durante los tests
    settings.CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
    # Sin internet: la API de feriados devuelve una lista fija
    monkeypatch.setattr(HolidayService, "get_holidays", classmethod(lambda cls, year: [f"{year}-05-25"]))
    # Sin llamadas a la API de Node
    settings.NODE_API_URL = ""
    settings.JWT_SECRET = JWT_DE_PRUEBA
    settings.JWT_ISSUER = "aldia-auth"
    settings.API_KEY_INTERNA = "clave-de-prueba"
    # Los contadores de throttling viven en la caché: se limpian entre tests
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def cliente():
    return APIClient()


@pytest.fixture
def autenticar(cliente):
    def _autenticar(usuario_id=USUARIO_A, rol="USUARIO"):
        cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {generar_token(usuario_id, rol)}")
        return cliente

    return _autenticar


@pytest.fixture
def grupo(db):
    """USUARIO_A es admin y USUARIO_B es miembro. USUARIO_C no pertenece."""
    nuevo = Grupo.objects.create(nombre="Familia", creado_por=USUARIO_A)
    MembresiaGrupo.objects.create(grupo=nuevo, usuario_id=USUARIO_A, alias="Ana", rol="admin")
    MembresiaGrupo.objects.create(grupo=nuevo, usuario_id=USUARIO_B, alias="Beto", rol="miembro")
    return nuevo
