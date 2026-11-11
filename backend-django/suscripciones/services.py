"""
Capa de servicios (Clase 5): las reglas de negocio, independientes de HTTP.
Las usan por igual las vistas REST, GraphQL y los WebSockets.
"""

import logging
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

import requests
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from rest_framework.exceptions import ValidationError

from .fechas import proximo_cobro_desde, siguiente_fecha_cobro, sumar_meses
from .models import Grupo, MembresiaGrupo, Pago, SecurityLog
from .repositories import GrupoRepository, SuscripcionRepository
from .servicio_node import registrar_precio_en_historial

logger = logging.getLogger(__name__)
security_logger = logging.getLogger("security")


class HolidayService:
    """Clase 5: API externa de feriados con caché cache-aside."""

    API_URL = "https://date.nager.at/api/v3/PublicHolidays/{year}/AR"

    @classmethod
    def get_holidays(cls, year: int) -> list[str]:
        cache_key = f"holidays_{year}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        try:
            response = requests.get(cls.API_URL.format(year=year), timeout=5)
            response.raise_for_status()
            dates = [item["date"] for item in response.json()]
            cache.set(cache_key, dates, timeout=60 * 60 * 24)  # 24 horas
        except (requests.RequestException, ValueError, KeyError):
            dates = []
            cache.set(cache_key, dates, timeout=60 * 5)  # Si falló, reintentamos en 5 minutos
        return dates

    @classmethod
    def is_holiday(cls, some_date) -> bool:
        return str(some_date) in cls.get_holidays(some_date.year)


class NotificationService:
    """Clase 10: avisa por WebSocket a los miembros conectados a un grupo."""

    @staticmethod
    def notify_suscripcion_creada(suscripcion):
        NotificationService._evento_suscripcion("suscripcion_creada", suscripcion)

    @staticmethod
    def notify_suscripcion_actualizada(suscripcion):
        NotificationService._evento_suscripcion("suscripcion_actualizada", suscripcion)

    @staticmethod
    def notify_pago_registrado(suscripcion, pago):
        NotificationService._evento_suscripcion("pago_registrado", suscripcion, {"monto": float(pago.monto)})

    @staticmethod
    def notify_miembro_agregado(membresia):
        NotificationService._send(membresia.grupo_id, {
            "event": "miembro_agregado",
            "usuario": membresia.alias or membresia.usuario_id,
            "rol": membresia.rol,
        })

    @staticmethod
    def _evento_suscripcion(evento, suscripcion, extra=None):
        if suscripcion.grupo_id is None:
            return  # Las suscripciones personales no tienen a quién avisar
        NotificationService._send(suscripcion.grupo_id, {
            "event": evento,
            "suscripcion_id": suscripcion.id,
            "nombre": suscripcion.nombre,
            "estado": suscripcion.estado,
            **(extra or {}),
        })

    @staticmethod
    def _send(grupo_id, payload):
        channel_layer = get_channel_layer()
        try:
            async_to_sync(channel_layer.group_send)(
                f"grupo_{grupo_id}",
                {
                    "type": "grupo_notification",  # Coincide con el método del consumer
                    "payload": payload,
                },
            )
        except Exception:
            # Si Redis está caído, el dato igual se guardó: solo avisamos en el log
            logger.exception("No se pudo enviar la notificación en tiempo real")


class MembershipService:
    """Clase 7: única fuente de verdad para las preguntas de membresía."""

    @staticmethod
    def is_member(usuario, grupo) -> bool:
        return MembresiaGrupo.objects.filter(grupo=grupo, usuario_id=usuario.id).exists()

    @staticmethod
    def is_admin(usuario, grupo) -> bool:
        return MembresiaGrupo.objects.filter(grupo=grupo, usuario_id=usuario.id, rol="admin").exists()

    @staticmethod
    def grupos_para(usuario):
        return GrupoRepository.del_usuario(usuario.id)


class GrupoService:
    @staticmethod
    def crear(serializer, usuario) -> Grupo:
        # Todo o nada: nunca debe quedar un grupo sin admin
        with transaction.atomic():
            grupo = serializer.save(creado_por=usuario.id)
            MembresiaGrupo.objects.create(grupo=grupo, usuario_id=usuario.id, alias=usuario.alias, rol="admin")
        return grupo

    @staticmethod
    def agregar_miembro(grupo, usuario_id, alias, rol) -> MembresiaGrupo:
        if GrupoRepository.membresia(grupo, usuario_id).exists():
            raise ValidationError("Ese usuario ya es miembro del grupo.")
        membresia = MembresiaGrupo.objects.create(grupo=grupo, usuario_id=usuario_id, alias=alias, rol=rol)
        NotificationService.notify_miembro_agregado(membresia)
        return membresia

    @staticmethod
    def resumen(grupo) -> dict:
        """Clase 5 (tarea): cantidad de suscripciones por estado y gasto mensual del grupo."""
        queryset = SuscripcionRepository.del_grupo(grupo)
        conteos = {
            fila["estado"]: fila["total"]
            for fila in queryset.order_by().values("estado").annotate(total=Count("id"))
        }
        mensual = {"ARS": Decimal("0"), "USD": Decimal("0")}
        for suscripcion in queryset.filter(estado="activa"):
            mensual[suscripcion.moneda] += suscripcion.costo_mensual
        return {
            "grupo": grupo.id,
            "activa": conteos.get("activa", 0),
            "pausada": conteos.get("pausada", 0),
            "cancelada": conteos.get("cancelada", 0),
            "mensual": mensual,
        }


class SuscripcionService:
    @staticmethod
    def crear(serializer, usuario):
        suscripcion = serializer.save(usuario_id=usuario.id)
        registrar_precio_en_historial(suscripcion)  # Primer precio del historial
        NotificationService.notify_suscripcion_creada(suscripcion)
        return suscripcion

    @staticmethod
    def actualizar(serializer, anterior):
        monto_anterior, moneda_anterior = anterior.monto, anterior.moneda
        datos = serializer.validated_data
        hoy = date.today()

        cambios_de_fecha = any(
            campo in datos and datos[campo] != getattr(anterior, campo)
            for campo in ("dia_cobro", "frecuencia", "fecha_inicio")
        )
        se_reactiva = datos.get("estado") == "activa" and anterior.estado != "activa"

        extra = {}
        if cambios_de_fecha or (se_reactiva and anterior.proxima_fecha_cobro < hoy):
            extra["proxima_fecha_cobro"] = proximo_cobro_desde(
                datos.get("fecha_inicio", anterior.fecha_inicio),
                datos.get("frecuencia", anterior.frecuencia),
                datos.get("dia_cobro", anterior.dia_cobro),
            )

        suscripcion = serializer.save(**extra)

        if suscripcion.monto != monto_anterior or suscripcion.moneda != moneda_anterior:
            registrar_precio_en_historial(suscripcion, monto_anterior, moneda_anterior)

        NotificationService.notify_suscripcion_actualizada(suscripcion)
        return suscripcion

    @staticmethod
    def cancelar(suscripcion):
        """Borrado lógico: se conserva el historial de pagos y precios."""
        suscripcion.estado = "cancelada"
        suscripcion.save(update_fields=["estado", "actualizado"])
        NotificationService.notify_suscripcion_actualizada(suscripcion)
        return suscripcion

    @staticmethod
    def proximas(queryset, dias):
        limite = date.today() + timedelta(days=dias)
        return queryset.filter(estado="activa", proxima_fecha_cobro__lte=limite)

    @staticmethod
    def resumen(queryset) -> dict:
        """Totales para el panel. Se separan pesos y dólares; el frontend aplica la cotización."""
        activas = list(queryset.filter(estado="activa"))

        mensual = {"ARS": Decimal("0"), "USD": Decimal("0")}
        por_categoria = defaultdict(lambda: {"ARS": Decimal("0"), "USD": Decimal("0")})
        colores = {}

        for suscripcion in activas:
            mensual[suscripcion.moneda] += suscripcion.costo_mensual
            nombre = suscripcion.categoria.nombre if suscripcion.categoria else "Sin categoría"
            colores[nombre] = suscripcion.categoria.color if suscripcion.categoria else "#94A3B8"
            por_categoria[nombre][suscripcion.moneda] += suscripcion.costo_mensual

        return {
            "cantidad_activas": len(activas),
            "cantidad_pausadas": queryset.filter(estado="pausada").count(),
            "mensual": mensual,
            "anual": {moneda: total * 12 for moneda, total in mensual.items()},
            "por_categoria": [
                {"categoria": nombre, "color": colores[nombre], **totales}
                for nombre, totales in sorted(por_categoria.items())
            ],
            "proximo_cobro": min(activas, key=lambda s: s.proxima_fecha_cobro, default=None),
        }

    @staticmethod
    def registrar_pago(suscripcion, datos) -> Pago:
        """Confirma el cobro actual, lo guarda como Pago y avanza la próxima fecha."""
        if suscripcion.estado != "activa":
            raise ValidationError("Solo se pueden registrar pagos de suscripciones activas.")

        # transaction.atomic: o se guardan las dos cosas, o ninguna
        with transaction.atomic():
            pago = Pago.objects.create(
                suscripcion=suscripcion,
                fecha_pago=datos.get("fecha_pago", date.today()),
                fecha_cobro=suscripcion.proxima_fecha_cobro,
                monto=datos.get("monto", suscripcion.monto),
                moneda=suscripcion.moneda,
                cotizacion=datos.get("cotizacion") if suscripcion.moneda == "USD" else None,
            )
            suscripcion.proxima_fecha_cobro = siguiente_fecha_cobro(
                suscripcion.proxima_fecha_cobro, suscripcion.frecuencia, suscripcion.dia_cobro
            )
            suscripcion.save(update_fields=["proxima_fecha_cobro", "actualizado"])

        NotificationService.notify_pago_registrado(suscripcion, pago)
        return pago


class PagoService:
    @staticmethod
    def total_por_mes(queryset, meses) -> list[dict]:
        """Total pagado por mes en los últimos N meses (agrupado en la base con TruncMonth)."""
        inicio = sumar_meses(date.today().replace(day=1), -(meses - 1), 1)

        filas = (
            queryset.filter(fecha_pago__gte=inicio)
            .order_by()
            .annotate(mes=TruncMonth("fecha_pago"))
            .values("mes", "moneda")
            .annotate(total=Sum("monto"))
        )

        resultado = {}
        for indice in range(meses):
            mes = sumar_meses(inicio, indice, 1)
            resultado[mes] = {"mes": mes.strftime("%Y-%m"), "ARS": Decimal("0"), "USD": Decimal("0")}
        for fila in filas:
            mes = fila["mes"]
            mes = mes.date() if hasattr(mes, "date") else mes
            if mes in resultado:
                resultado[mes][fila["moneda"]] = fila["total"]

        return list(resultado.values())


class AuditoriaService:
    """Clase 8: cada evento queda en la base (SecurityLog) y en el archivo security.log."""

    @staticmethod
    def registrar(accion, request, detalle=""):
        ip = request.META.get("REMOTE_ADDR") if request is not None else None
        usuario = getattr(request, "user", None)
        autenticado = getattr(usuario, "is_authenticated", False)
        usuario_id = str(getattr(usuario, "id", "") or "") if autenticado else ""
        SecurityLog.objects.create(action=accion, usuario_id=usuario_id[:24], detail=detalle[:255], ip_address=ip)
        security_logger.warning("%s usuario=%s ip=%s %s", accion, usuario_id or "anonimo", ip, detalle)
