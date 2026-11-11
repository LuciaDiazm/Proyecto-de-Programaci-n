import pytest
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator

from config.asgi import application
from suscripciones.models import Grupo, MembresiaGrupo, Suscripcion
from suscripciones.services import NotificationService

from .conftest import USUARIO_A, USUARIO_B, USUARIO_C, generar_token

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.asyncio]


def conectar(grupo_id, usuario_id=None):
    consulta = f"?token={generar_token(usuario_id)}" if usuario_id else ""
    return WebsocketCommunicator(application, f"/ws/grupos/{grupo_id}/{consulta}")


@database_sync_to_async
def crear_grupo():
    nuevo = Grupo.objects.create(nombre="Familia", creado_por=USUARIO_A)
    MembresiaGrupo.objects.create(grupo=nuevo, usuario_id=USUARIO_A, alias="Ana", rol="admin")
    MembresiaGrupo.objects.create(grupo=nuevo, usuario_id=USUARIO_B, alias="Beto", rol="miembro")
    return nuevo


async def test_sin_token_se_rechaza():
    grupo = await crear_grupo()
    conectado, _ = await conectar(grupo.id).connect()
    assert conectado is False


async def test_no_miembro_se_rechaza():
    grupo = await crear_grupo()
    conectado, _ = await conectar(grupo.id, USUARIO_C).connect()
    assert conectado is False


async def test_miembro_recibe_presencia_y_eventos():
    grupo = await crear_grupo()
    ana = conectar(grupo.id, USUARIO_A)
    assert (await ana.connect())[0] is True
    assert (await ana.receive_json_from())["status"] == "online"

    beto = conectar(grupo.id, USUARIO_B)
    assert (await beto.connect())[0] is True
    assert (await ana.receive_json_from())["status"] == "online"
    await beto.receive_json_from()

    suscripcion = await database_sync_to_async(Suscripcion.objects.create)(
        usuario_id=USUARIO_A, grupo=grupo, nombre="Max", monto=1, dia_cobro=1
    )
    await database_sync_to_async(NotificationService.notify_suscripcion_creada)(suscripcion)
    evento = await beto.receive_json_from()
    assert evento["event"] == "suscripcion_creada"
    assert evento["nombre"] == "Max"

    assert (await ana.receive_json_from())["event"] == "suscripcion_creada"

    await beto.disconnect()
    assert (await ana.receive_json_from())["status"] == "offline"
    await ana.disconnect()


async def test_eco_y_json_invalido():
    grupo = await crear_grupo()
    ana = conectar(grupo.id, USUARIO_A)
    await ana.connect()
    await ana.receive_json_from()
    await ana.send_to(text_data='{"hola": 1}')
    assert await ana.receive_json_from() == {"echo": {"hola": 1}}
    await ana.send_to(text_data="no es json")
    assert "error" in await ana.receive_json_from()
    await ana.disconnect()
