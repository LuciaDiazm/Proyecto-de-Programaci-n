"""
Capa de repositorios (Clase 5): acá viven las consultas a la base.
Las vistas y los servicios piden datos con nombres del negocio, sin armar el ORM.
"""

from django.db.models import Q

from .models import Categoria, Etiqueta, Grupo, MembresiaGrupo, Pago, Suscripcion


class CategoriaRepository:
    @staticmethod
    def get_queryset():
        return Categoria.objects.all()


class EtiquetaRepository:
    @staticmethod
    def del_usuario(usuario_id):
        return Etiqueta.objects.filter(usuario_id=usuario_id)


class SuscripcionRepository:
    @staticmethod
    def get_queryset():
        return Suscripcion.objects.select_related("categoria", "grupo").prefetch_related("etiquetas")

    @staticmethod
    def visibles_para(usuario_id):
        """Las propias y las de los grupos a los que pertenece (Clase 7)."""
        return SuscripcionRepository.get_queryset().filter(
            Q(usuario_id=usuario_id) | Q(grupo__membresias__usuario_id=usuario_id)
        ).distinct()

    @staticmethod
    def propias(queryset, usuario_id):
        return queryset.filter(usuario_id=usuario_id)

    @staticmethod
    def activas_hasta(limite):
        """Consulta para la ruta interna que usa la API de Node."""
        return Suscripcion.objects.filter(estado="activa", proxima_fecha_cobro__lte=limite)

    @staticmethod
    def del_grupo(grupo):
        return SuscripcionRepository.get_queryset().filter(grupo=grupo)


class PagoRepository:
    @staticmethod
    def del_usuario(usuario_id):
        return Pago.objects.select_related("suscripcion").filter(suscripcion__usuario_id=usuario_id)


class GrupoRepository:
    @staticmethod
    def del_usuario(usuario_id):
        # order_by("id") mantiene estable la paginación
        return (
            Grupo.objects.filter(membresias__usuario_id=usuario_id)
            .prefetch_related("membresias")
            .distinct()
            .order_by("id")
        )

    @staticmethod
    def membresia(grupo, usuario_id):
        return MembresiaGrupo.objects.filter(grupo=grupo, usuario_id=usuario_id)
