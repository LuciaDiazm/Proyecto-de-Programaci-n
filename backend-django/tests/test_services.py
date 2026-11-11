from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
import requests
from django.core.cache import cache
from rest_framework.exceptions import ValidationError

from suscripciones import services
from suscripciones.autenticacion import UsuarioToken
from suscripciones.models import Suscripcion
from suscripciones.services import GrupoService, HolidayService, MembershipService, SuscripcionService

from .conftest import USUARIO_A, USUARIO_C

OBTENER_FERIADOS_ORIGINAL = HolidayService.__dict__["get_holidays"]


def crear(usuario_id=USUARIO_A, **datos):
    valores = {"nombre": "Netflix", "monto": Decimal("8999"), "dia_cobro": 10}
    valores.update(datos)
    return Suscripcion.objects.create(usuario_id=usuario_id, **valores)


def test_is_holiday_usa_la_lista_de_feriados():
    assert HolidayService.is_holiday(date(2030, 5, 25)) is True
    assert HolidayService.is_holiday(date(2030, 5, 26)) is False


def test_feriados_cache_aside_consulta_una_sola_vez(monkeypatch):
    monkeypatch.setattr(HolidayService, "get_holidays", OBTENER_FERIADOS_ORIGINAL)
    cache.clear()
    respuesta = MagicMock()
    respuesta.json.return_value = [{"date": "2031-07-09"}]
    with patch.object(services.requests, "get", return_value=respuesta) as llamada:
        assert HolidayService.get_holidays(2031) == ["2031-07-09"]
        assert HolidayService.get_holidays(2031) == ["2031-07-09"]
    assert llamada.call_count == 1
    assert llamada.call_args.kwargs["timeout"] == 5


def test_si_la_api_de_feriados_falla_devuelve_lista_vacia(monkeypatch):
    monkeypatch.setattr(HolidayService, "get_holidays", OBTENER_FERIADOS_ORIGINAL)
    cache.clear()
    with patch.object(services.requests, "get", side_effect=requests.Timeout):
        assert HolidayService.get_holidays(2032) == []


@pytest.mark.django_db
def test_registrar_pago_avanza_la_proxima_fecha():
    suscripcion = crear(dia_cobro=31, proxima_fecha_cobro=date(2026, 1, 31))
    SuscripcionService.registrar_pago(suscripcion, {"fecha_pago": date(2026, 1, 31)})
    suscripcion.refresh_from_db()
    assert suscripcion.proxima_fecha_cobro == date(2026, 2, 28)
    assert suscripcion.pagos.count() == 1


@pytest.mark.django_db
def test_no_se_paga_una_suscripcion_pausada():
    suscripcion = crear(estado="pausada")
    with pytest.raises(ValidationError):
        SuscripcionService.registrar_pago(suscripcion, {})


@pytest.mark.django_db
def test_membership_service(grupo):
    ana = UsuarioToken({"id": USUARIO_A})
    caro = UsuarioToken({"id": USUARIO_C})
    assert MembershipService.is_admin(ana, grupo) is True
    assert MembershipService.is_member(caro, grupo) is False
    assert list(MembershipService.grupos_para(ana)) == [grupo]


@pytest.mark.django_db
def test_agregar_dos_veces_al_mismo_miembro_falla(grupo):
    GrupoService.agregar_miembro(grupo, USUARIO_C, "Caro", "miembro")
    with pytest.raises(ValidationError):
        GrupoService.agregar_miembro(grupo, USUARIO_C, "Caro", "miembro")


@pytest.mark.django_db
def test_resumen_de_grupo_cuenta_por_estado(grupo):
    crear(grupo=grupo, monto=Decimal("12000"), frecuencia="anual")
    crear(grupo=grupo, estado="pausada")
    datos = GrupoService.resumen(grupo)
    assert (datos["activa"], datos["pausada"], datos["cancelada"]) == (1, 1, 0)
    assert datos["mensual"]["ARS"] == Decimal("1000.00")
