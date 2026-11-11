import hmac

from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .services import AuditoriaService, MembershipService


class EsAdminOSoloLectura(BasePermission):
    """Cualquier usuario logueado puede leer; solo un ADMIN global puede crear, editar o borrar."""

    message = "Acceso denegado, se requieren privilegios de administrador"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(request.user, "es_admin", False)


class EsAdminDelGrupoOSoloLectura(BasePermission):
    """
    Clase 7. Sirve para Grupo (el objeto es su propio grupo) y para Suscripcion (obj.grupo).
    Cualquier miembro lee; solo un admin del grupo modifica.
    Una suscripción sin grupo es personal: get_queryset ya garantizó que es del usuario.
    """

    message = "Solo un admin del grupo puede modificarlo."

    def has_object_permission(self, request, view, obj):
        grupo = obj.grupo if hasattr(obj, "grupo") else obj
        if grupo is None:
            return True
        if request.method in SAFE_METHODS:
            return MembershipService.is_member(request.user, grupo)
        if MembershipService.is_admin(request.user, grupo):
            return True
        # Clase 8 (tarea): queda registrado cada intento de un miembro sin permiso
        AuditoriaService.registrar("permission_denied", request, f"{request.method} {request.path}")
        return False


class TieneApiKeyInterna(BasePermission):
    """
    Para rutas que solo usa la API de Node (servidor a servidor).
    Se compara con hmac.compare_digest para no filtrar información por tiempos de respuesta.
    """

    message = "Clave interna inválida"

    def has_permission(self, request, view):
        clave_recibida = request.headers.get("X-API-KEY", "")
        clave_esperada = settings.API_KEY_INTERNA or ""
        if not clave_esperada:
            return False
        return hmac.compare_digest(clave_recibida, clave_esperada)
