import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        detalle = response.data
        if isinstance(detalle, list) and len(detalle) == 1:
            detalle = detalle[0]  # Un solo mensaje: viaja como texto simple
        elif isinstance(detalle, dict) and set(detalle) == {"detail"}:
            detalle = detalle["detail"]
        response.data = {
            "error": True,
            "detail": detalle,
        }
        return response

    # Error no previsto: lo dejamos registrado en consola para poder depurarlo
    logger.exception("Error no controlado en %s", context.get("view"))
    return Response(
        {"error": True, "detail": "Error interno del servidor."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
