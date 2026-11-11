from datetime import date
from decimal import Decimal
from io import StringIO

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command

from suscripciones.models import Categoria, Etiqueta, SecurityLog, Suscripcion

from .conftest import USUARIO_A, USUARIO_B, USUARIO_C, generar_token

pytestmark = pytest.mark.django_db


def crear(usuario_id=USUARIO_A, **datos):
    valores = {"nombre": "Netflix", "monto": Decimal("8999"), "dia_cobro": 10}
    valores.update(datos)
    return Suscripcion.objects.create(usuario_id=usuario_id, **valores)


# --- Autenticación ---


def test_sin_token_responde_401(cliente):
    respuesta = cliente.get("/api/suscripciones/")
    assert respuesta.status_code == 401
    assert respuesta.data["error"] is True


@pytest.mark.parametrize("vencido,clave", [(True, None), (False, "una-clave-distinta-de-la-real-con-mas-de-32-bytes")])
def test_token_vencido_o_con_otra_clave_se_rechaza(cliente, vencido, clave):
    token = generar_token(USUARIO_A, vencido=vencido, clave=clave)
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert cliente.get("/api/suscripciones/").status_code == 401


def test_registro_login_y_refresh_con_rotacion(cliente):
    registro = cliente.post(
        "/api/register/", {"username": "ana", "email": "ana@x.com", "password": "clave-Segura-987"}, format="json"
    )
    assert registro.status_code == 201
    assert "password" not in registro.data

    login = cliente.post("/api/token/", {"username": "ana", "password": "clave-Segura-987"}, format="json")
    assert login.status_code == 200

    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    assert cliente.get("/api/suscripciones/").status_code == 200
    cliente.credentials()

    refresco = cliente.post("/api/token/refresh/", {"refresh": login.data["refresh"]}, format="json")
    assert refresco.status_code == 200
    assert refresco.data["refresh"] != login.data["refresh"]
    # El refresh anterior quedó en la lista negra
    assert cliente.post("/api/token/refresh/", {"refresh": login.data["refresh"]}, format="json").status_code == 401


def test_registro_rechaza_contrasena_debil(cliente):
    respuesta = cliente.post("/api/register/", {"username": "ana", "password": "123"}, format="json")
    assert respuesta.status_code == 400


def test_login_fallido_queda_auditado_y_se_limita(cliente):
    User.objects.create_user(username="ana", password="clave-Segura-987")
    codigos = [
        cliente.post("/api/token/", {"username": "ana", "password": "incorrecta"}, format="json").status_code
        for _ in range(6)
    ]
    assert codigos == [401, 401, 401, 401, 401, 429]
    assert SecurityLog.objects.filter(action="login_failed").count() == 5


def test_cuenta_de_django_tiene_sus_propios_datos(cliente):
    usuario = User.objects.create_user(username="ana", password="clave-Segura-987")
    login = cliente.post("/api/token/", {"username": "ana", "password": "clave-Segura-987"}, format="json")
    cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    creada = cliente.post("/api/suscripciones/", {"nombre": "Max", "monto": "10", "dia_cobro": 2}, format="json")
    assert creada.status_code == 201
    assert Suscripcion.objects.get(pk=creada.data["id"]).usuario_id == f"dj-{usuario.pk}"


def test_salud_y_version(cliente):
    assert cliente.get("/api/health/").json()["status"] == "ok"
    assert cliente.get("/api/health/version/").json() == {"version": "1.0.0"}


# --- CRUD, paginación y filtros ---


def test_crear_toma_el_usuario_del_token(autenticar):
    cliente = autenticar()
    categoria = Categoria.objects.get(nombre="Streaming")
    respuesta = cliente.post("/api/suscripciones/", {
        "nombre": "Disney+", "monto": "7500", "dia_cobro": 31,
        "categoria": categoria.id, "usuario_id": USUARIO_B,  # Intento de suplantación
    }, format="json")
    assert respuesta.status_code == 201, respuesta.data
    assert Suscripcion.objects.get(pk=respuesta.data["id"]).usuario_id == USUARIO_A


def test_un_usuario_no_ve_ni_modifica_lo_de_otro(autenticar):
    ajena = crear(USUARIO_B)
    cliente = autenticar()
    assert cliente.get("/api/suscripciones/").data["results"] == []
    assert cliente.get(f"/api/suscripciones/{ajena.id}/").status_code == 404
    assert cliente.delete(f"/api/suscripciones/{ajena.id}/").status_code == 404


def test_validacion_devuelve_400_con_formato_propio(autenticar):
    respuesta = autenticar().post("/api/suscripciones/", {"nombre": "X", "monto": "-1", "dia_cobro": 40}, format="json")
    assert respuesta.status_code == 400
    assert respuesta.data["error"] is True
    assert {"nombre", "monto", "dia_cobro"} <= set(respuesta.data["detail"])


def test_paginacion(autenticar):
    for numero in range(12):
        crear(nombre=f"Servicio {numero}")
    primera = autenticar().get("/api/suscripciones/")
    assert primera.data["count"] == 12
    assert len(primera.data["results"]) == 10
    assert primera.data["next"] is not None
    assert len(autenticar().get("/api/suscripciones/?page=2").data["results"]) == 2
    assert len(autenticar().get("/api/suscripciones/?page_size=50").data["results"]) == 12


def test_filtro_busqueda_y_orden(autenticar):
    crear(nombre="Spotify", moneda="USD", monto=Decimal("4.99"))
    crear(nombre="Netflix", monto=Decimal("9000"))
    crear(nombre="Gimnasio", monto=Decimal("20000"), estado="pausada")
    cliente = autenticar()

    assert [s["nombre"] for s in cliente.get("/api/suscripciones/?moneda=USD").data["results"]] == ["Spotify"]
    assert [s["nombre"] for s in cliente.get("/api/suscripciones/?search=netf").data["results"]] == ["Netflix"]
    assert [s["nombre"] for s in cliente.get("/api/suscripciones/?estado=pausada").data["results"]] == ["Gimnasio"]
    ordenadas = cliente.get("/api/suscripciones/?ordering=-monto").data["results"]
    assert [s["nombre"] for s in ordenadas] == ["Gimnasio", "Netflix", "Spotify"]


def test_borrar_es_logico(autenticar):
    suscripcion = crear()
    cliente = autenticar()
    cliente.delete(f"/api/suscripciones/{suscripcion.id}/")
    suscripcion.refresh_from_db()
    assert suscripcion.estado == "cancelada"
    assert cliente.get("/api/suscripciones/").data["results"] == []
    assert cliente.get("/api/suscripciones/?incluir_canceladas=true").data["count"] == 1


def test_registrar_pago_por_api(autenticar):
    suscripcion = crear(dia_cobro=31, proxima_fecha_cobro=date(2026, 1, 31))
    respuesta = autenticar().post(
        f"/api/suscripciones/{suscripcion.id}/registrar-pago/", {"fecha_pago": "2026-01-31"}, format="json"
    )
    assert respuesta.status_code == 201, respuesta.data
    assert respuesta.data["suscripcion"]["proxima_fecha_cobro"] == "2026-02-28"


def test_resumen_separa_monedas_y_calcula_costo_mensual(autenticar):
    crear(monto=Decimal("12000"), frecuencia="anual")
    crear(nombre="Spotify", monto=Decimal("4.99"), moneda="USD")
    datos = autenticar().get("/api/suscripciones/resumen/").data
    assert datos["mensual"]["ARS"] == Decimal("1000.00")
    assert datos["mensual"]["USD"] == Decimal("4.99")
    assert datos["cantidad_activas"] == 2


def test_campo_calculado_cobro_en_feriado(autenticar):
    crear(proxima_fecha_cobro=date(2030, 5, 25), dia_cobro=25)
    assert autenticar().get("/api/suscripciones/").data["results"][0]["cobro_en_feriado"] is True


def test_sanitiza_html_en_descripcion(autenticar):
    respuesta = autenticar().post("/api/suscripciones/", {
        "nombre": "Prueba", "monto": "10", "dia_cobro": 1,
        "descripcion": "<script>alert(1)</script>Hola <b>mundo</b>",
    }, format="json")
    assert respuesta.data["descripcion"] == "Hola mundo"


def test_etiquetas_muchos_a_muchos(autenticar):
    cliente = autenticar()
    etiqueta = cliente.post("/api/etiquetas/", {"nombre": "Trabajo"}, format="json").data
    creada = cliente.post("/api/suscripciones/", {
        "nombre": "Slack", "monto": "10", "dia_cobro": 1, "etiquetas": [etiqueta["id"]],
    }, format="json")
    assert creada.status_code == 201, creada.data
    assert creada.data["etiquetas_detalle"] == [{"id": etiqueta["id"], "nombre": "trabajo"}]
    assert cliente.get(f"/api/suscripciones/?etiquetas={etiqueta['id']}").data["count"] == 1


def test_no_se_puede_usar_una_etiqueta_ajena(autenticar):
    ajena = Etiqueta.objects.create(usuario_id=USUARIO_B, nombre="ajena")
    respuesta = autenticar().post("/api/suscripciones/", {
        "nombre": "Slack", "monto": "10", "dia_cobro": 1, "etiquetas": [ajena.id],
    }, format="json")
    assert respuesta.status_code == 400


def test_solo_admin_modifica_categorias(autenticar):
    assert autenticar().post("/api/categorias/", {"nombre": "Juegos"}).status_code == 403
    assert autenticar(rol="ADMIN").post("/api/categorias/", {"nombre": "Juegos"}).status_code == 201


def test_categoria_en_uso_no_se_borra(autenticar):
    categoria = Categoria.objects.get(nombre="Streaming")
    crear(categoria=categoria)
    assert autenticar(rol="ADMIN").delete(f"/api/categorias/{categoria.id}/").status_code == 409


def test_ruta_interna_exige_api_key(cliente):
    crear(fecha_inicio=date.today(), dia_cobro=date.today().day)
    assert cliente.get("/api/internos/proximos-cobros/").status_code == 403
    respuesta = cliente.get("/api/internos/proximos-cobros/", HTTP_X_API_KEY="clave-de-prueba")
    assert respuesta.status_code == 200
    assert len(respuesta.data) == 1


def test_pagos_por_mes(autenticar):
    suscripcion = crear()
    cliente = autenticar()
    cliente.post(f"/api/suscripciones/{suscripcion.id}/registrar-pago/", {}, format="json")
    filas = cliente.get("/api/pagos/por-mes/?meses=3").data
    assert len(filas) == 3
    assert filas[-1]["ARS"] == Decimal("8999.00")
    assert cliente.get("/api/pagos/").data["count"] == 1
    assert cliente.get("/api/pagos/por-mes/?meses=99").status_code == 400


def test_comando_importar_informa_el_registro_invalido():
    salida, errores = StringIO(), StringIO()
    call_command("importar_suscripciones", usuario=USUARIO_A, stdout=salida, stderr=errores)
    assert "Importación finalizada" in salida.getvalue()
    assert "WARNING: Item sin nombre" in errores.getvalue()
    assert Suscripcion.objects.filter(nombre="Crunchyroll").exists()


# --- Grupos: matriz de permisos de la Clase 7 ---


def test_crear_grupo_deja_al_creador_como_admin(autenticar):
    respuesta = autenticar(USUARIO_C).post("/api/grupos/", {"nombre": "Depto"}, format="json")
    assert respuesta.status_code == 201
    assert respuesta.data["mi_rol"] == "admin"


def test_no_miembro_recibe_404(autenticar, grupo):
    cliente = autenticar(USUARIO_C)
    assert cliente.get(f"/api/grupos/{grupo.id}/").status_code == 404
    assert cliente.get("/api/grupos/").data["results"] == []


def test_miembro_puede_leer_pero_no_modificar(autenticar, grupo):
    compartida = crear(USUARIO_A, grupo=grupo)
    cliente = autenticar(USUARIO_B)
    assert cliente.get(f"/api/grupos/{grupo.id}/").status_code == 200
    detalle = cliente.get(f"/api/suscripciones/{compartida.id}/")
    assert detalle.status_code == 200
    assert detalle.data["puede_editar"] is False
    assert cliente.patch(f"/api/suscripciones/{compartida.id}/", {"monto": "1"}, format="json").status_code == 403
    assert cliente.patch(f"/api/grupos/{grupo.id}/", {"nombre": "Otro"}, format="json").status_code == 403
    assert SecurityLog.objects.filter(action="permission_denied", usuario_id=USUARIO_B).count() == 2


def test_miembro_no_puede_crear_en_el_grupo(autenticar, grupo):
    respuesta = autenticar(USUARIO_B).post(
        "/api/suscripciones/", {"nombre": "Max", "monto": "10", "dia_cobro": 1, "grupo": grupo.id}, format="json"
    )
    assert respuesta.status_code == 403


def test_admin_puede_crear_en_el_grupo(autenticar, grupo):
    respuesta = autenticar(USUARIO_A).post(
        "/api/suscripciones/", {"nombre": "Max", "monto": "10", "dia_cobro": 1, "grupo": grupo.id}, format="json"
    )
    assert respuesta.status_code == 201
    assert respuesta.data["grupo_nombre"] == "Familia"
    assert respuesta.data["puede_editar"] is True


def test_no_se_puede_mover_a_un_grupo_donde_no_es_admin(autenticar, grupo):
    propia = crear(USUARIO_C)
    respuesta = autenticar(USUARIO_C).patch(f"/api/suscripciones/{propia.id}/", {"grupo": grupo.id}, format="json")
    assert respuesta.status_code == 403


def test_solo_propias_y_resumen_ignoran_las_compartidas(autenticar, grupo):
    crear(USUARIO_A, grupo=grupo)
    cliente = autenticar(USUARIO_B)
    assert cliente.get("/api/suscripciones/").data["count"] == 1
    assert cliente.get("/api/suscripciones/?solo_propias=true").data["count"] == 0
    assert cliente.get("/api/suscripciones/resumen/").data["cantidad_activas"] == 0


def test_add_member(autenticar, grupo):
    User.objects.create_user(username="caro", password="clave-Segura-987")
    cliente = autenticar(USUARIO_A)
    agregado = cliente.post(f"/api/grupos/{grupo.id}/add-member/", {"usuario": "caro"}, format="json")
    assert agregado.status_code == 201
    assert agregado.data["rol"] == "miembro"
    assert cliente.post(f"/api/grupos/{grupo.id}/add-member/", {"usuario": "caro"}, format="json").status_code == 400
    assert cliente.post(f"/api/grupos/{grupo.id}/add-member/", {"usuario": "nadie"}, format="json").status_code == 404


def test_miembro_no_puede_agregar_miembros(autenticar, grupo):
    respuesta = autenticar(USUARIO_B).post(f"/api/grupos/{grupo.id}/add-member/", {"usuario": "x"}, format="json")
    assert respuesta.status_code == 403


def test_summary_del_grupo(autenticar, grupo):
    crear(USUARIO_A, grupo=grupo)
    assert autenticar(USUARIO_B).get(f"/api/grupos/{grupo.id}/summary/").data["activa"] == 1
