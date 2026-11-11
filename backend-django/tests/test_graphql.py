import json

import pytest

from suscripciones.models import Suscripcion

from .conftest import USUARIO_A, USUARIO_B, USUARIO_C, generar_token

pytestmark = pytest.mark.django_db


@pytest.fixture
def consultar(client):
    def _consultar(query, usuario_id=None):
        encabezados = {"HTTP_AUTHORIZATION": f"Bearer {generar_token(usuario_id)}"} if usuario_id else {}
        respuesta = client.post(
            "/graphql/", data=json.dumps({"query": query}), content_type="application/json", **encabezados
        )
        return respuesta.json()

    return _consultar


def test_sin_token_no_devuelve_datos(consultar):
    assert consultar("{ misSuscripciones { nombre } }")["data"]["misSuscripciones"] == []


def test_query_devuelve_solo_lo_visible(consultar):
    Suscripcion.objects.create(usuario_id=USUARIO_A, nombre="Mía", monto=1, dia_cobro=1)
    Suscripcion.objects.create(usuario_id=USUARIO_B, nombre="Ajena", monto=1, dia_cobro=1)
    datos = consultar("{ misSuscripciones { nombre costoMensual } }", USUARIO_A)
    assert datos["data"]["misSuscripciones"] == [{"nombre": "Mía", "costoMensual": 1.0}]


def test_mutation_crea_la_suscripcion(consultar):
    mutacion = 'mutation { createSuscripcion(nombre: "Max", monto: "10.5", diaCobro: 3) { ok suscripcion { id estado } } }'
    datos = consultar(mutacion, USUARIO_A)
    assert datos["data"]["createSuscripcion"]["ok"] is True
    assert datos["data"]["createSuscripcion"]["suscripcion"]["estado"] == "activa"


def test_mutation_valida_con_el_serializer(consultar):
    datos = consultar('mutation { createSuscripcion(nombre: "X", monto: "10", diaCobro: 3) { ok } }', USUARIO_A)
    assert "Datos inválidos" in datos["errors"][0]["message"]


def test_mutation_exige_autenticacion(consultar):
    datos = consultar('mutation { createSuscripcion(nombre: "Max", monto: "10", diaCobro: 3) { ok } }')
    assert "Autenticación requerida" in datos["errors"][0]["message"]


def test_miembro_no_crea_ni_cambia_estado_en_el_grupo(consultar, grupo):
    compartida = Suscripcion.objects.create(usuario_id=USUARIO_A, grupo=grupo, nombre="Max", monto=1, dia_cobro=1)
    crear = f'mutation {{ createSuscripcion(nombre: "Otra", monto: "1", diaCobro: 1, grupoId: {grupo.id}) {{ ok }} }}'
    assert "Solo un admin" in consultar(crear, USUARIO_B)["errors"][0]["message"]
    cambiar = f'mutation {{ updateSuscripcionEstado(id: {compartida.id}, estado: "pausada") {{ ok }} }}'
    assert "Solo un admin" in consultar(cambiar, USUARIO_B)["errors"][0]["message"]
    assert consultar(cambiar, USUARIO_A)["data"]["updateSuscripcionEstado"]["ok"] is True


def test_no_miembro_no_encuentra_la_suscripcion(consultar, grupo):
    compartida = Suscripcion.objects.create(usuario_id=USUARIO_A, grupo=grupo, nombre="Max", monto=1, dia_cobro=1)
    cambiar = f'mutation {{ updateSuscripcionEstado(id: {compartida.id}, estado: "pausada") {{ ok }} }}'
    assert "no encontrada" in consultar(cambiar, USUARIO_C)["errors"][0]["message"]
