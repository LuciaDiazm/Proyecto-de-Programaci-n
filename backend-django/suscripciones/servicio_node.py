"""
Comunicación de Django hacia la API de Node.

Cuando se crea una suscripción o cambia su precio, avisamos a Node para que lo
guarde en el historial de precios (MongoDB). Si Node no responde, la operación en
Django NO falla: el historial es información complementaria.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _encabezados():
    return {"X-API-KEY": settings.API_KEY_INTERNA}


def registrar_precio_en_historial(suscripcion, precio_anterior=None, moneda_anterior=None):
    if not settings.NODE_API_URL or not settings.API_KEY_INTERNA:
        return False

    datos = {
        "usuarioId": suscripcion.usuario_id,
        "suscripcionId": suscripcion.id,
        "nombreSuscripcion": suscripcion.nombre,
        "precioAnterior": float(precio_anterior) if precio_anterior is not None else None,
        "monedaAnterior": moneda_anterior,
        "precioNuevo": float(suscripcion.monto),
        "moneda": suscripcion.moneda,
    }

    try:
        respuesta = requests.post(
            f"{settings.NODE_API_URL}/api/historial/interno", json=datos, headers=_encabezados(), timeout=3
        )
        respuesta.raise_for_status()
        return True
    except requests.RequestException as error:  # Node caído, timeout, etc.
        logger.warning("No se pudo registrar el precio en Node: %s", error)
        return False


def buscar_usuario_por_email(email):
    """Devuelve {"id", "nombre", "email"} de una cuenta de Node, o None si no existe."""
    if not settings.NODE_API_URL or not settings.API_KEY_INTERNA:
        return None

    try:
        respuesta = requests.get(
            f"{settings.NODE_API_URL}/api/usuarios/interno/buscar",
            params={"email": email},
            headers=_encabezados(),
            timeout=3,
        )
        if respuesta.status_code == 404:
            return None
        respuesta.raise_for_status()
        return respuesta.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("No se pudo buscar el usuario en Node: %s", error)
        return None
