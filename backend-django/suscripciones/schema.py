"""Clase 11: la misma lógica de REST (serializers, permisos y servicios), expuesta en GraphQL."""

import graphene
from graphene_django import DjangoObjectType
from graphql import GraphQLError

from .models import Categoria, Etiqueta, Grupo, MembresiaGrupo, Pago, Suscripcion
from .repositories import SuscripcionRepository
from .serializers import SuscripcionSerializer
from .services import MembershipService, SuscripcionService


class CategoriaType(DjangoObjectType):
    class Meta:
        model = Categoria
        fields = ("id", "nombre", "color")


class EtiquetaType(DjangoObjectType):
    class Meta:
        model = Etiqueta
        fields = ("id", "nombre")


class PagoType(DjangoObjectType):
    class Meta:
        model = Pago
        fields = ("id", "fecha_pago", "fecha_cobro", "monto", "moneda", "cotizacion")
        convert_choices_to_enum = False


class SuscripcionType(DjangoObjectType):
    costo_mensual = graphene.Float()

    class Meta:
        model = Suscripcion
        fields = (
            "id", "nombre", "descripcion", "monto", "moneda", "frecuencia", "dia_cobro",
            "proxima_fecha_cobro", "estado", "categoria", "etiquetas", "grupo", "pagos",
        )
        convert_choices_to_enum = False  # "activa" en vez de "ACTIVA", igual que en REST


class MembresiaType(DjangoObjectType):
    class Meta:
        model = MembresiaGrupo
        fields = ("id", "usuario_id", "alias", "rol")
        convert_choices_to_enum = False


class GrupoType(DjangoObjectType):
    class Meta:
        model = Grupo
        fields = ("id", "nombre", "descripcion", "membresias", "suscripciones")


def suscripciones_visibles(usuario):
    """Mismas reglas que SuscripcionViewSet.get_queryset (Clase 7)."""
    if not usuario.is_authenticated:
        return Suscripcion.objects.none()
    return SuscripcionRepository.visibles_para(usuario.id)


class Query(graphene.ObjectType):
    all_categorias = graphene.List(CategoriaType)
    all_grupos = graphene.List(GrupoType)
    mis_suscripciones = graphene.List(SuscripcionType)
    suscripcion = graphene.Field(SuscripcionType, id=graphene.ID(required=True))
    suscripciones_por_estado = graphene.List(SuscripcionType, estado=graphene.String(required=True))

    def resolve_all_categorias(root, info):
        if not info.context.user.is_authenticated:
            return Categoria.objects.none()
        return Categoria.objects.all()

    def resolve_all_grupos(root, info):
        usuario = info.context.user
        if not usuario.is_authenticated:
            return Grupo.objects.none()
        return MembershipService.grupos_para(usuario)

    def resolve_mis_suscripciones(root, info):
        return suscripciones_visibles(info.context.user)

    def resolve_suscripcion(root, info, id):
        return suscripciones_visibles(info.context.user).filter(pk=id).first()

    def resolve_suscripciones_por_estado(root, info, estado):
        return suscripciones_visibles(info.context.user).filter(estado=estado)


def errores_de(serializer):
    return {campo: [str(e) for e in lista] for campo, lista in serializer.errors.items()}


class CreateSuscripcion(graphene.Mutation):
    class Arguments:
        nombre = graphene.String(required=True)
        monto = graphene.Decimal(required=True)
        dia_cobro = graphene.Int(required=True)
        moneda = graphene.String(default_value="ARS")
        frecuencia = graphene.String(default_value="mensual")
        grupo_id = graphene.ID()

    suscripcion = graphene.Field(SuscripcionType)
    ok = graphene.Boolean()

    def mutate(root, info, nombre, monto, dia_cobro, moneda, frecuencia, grupo_id=None):
        usuario = info.context.user
        if not usuario.is_authenticated:
            raise GraphQLError("Autenticación requerida.")

        # Reutilizamos las validaciones del serializer de DRF
        serializer = SuscripcionSerializer(
            data={
                "nombre": nombre, "monto": monto, "dia_cobro": dia_cobro,
                "moneda": moneda, "frecuencia": frecuencia, "grupo": grupo_id,
            },
            context={"request": info.context},
        )
        if not serializer.is_valid():
            raise GraphQLError(f"Datos inválidos: {errores_de(serializer)}")

        # Misma regla de permisos que en REST
        grupo = serializer.validated_data.get("grupo")
        if grupo is not None and not MembershipService.is_admin(usuario, grupo):
            raise GraphQLError("Solo un admin del grupo puede crear suscripciones en él.")

        suscripcion = SuscripcionService.crear(serializer, usuario)
        return CreateSuscripcion(suscripcion=suscripcion, ok=True)


class UpdateSuscripcionEstado(graphene.Mutation):
    """Clase 11 (tarea): cambia el estado respetando las mismas reglas que REST."""

    class Arguments:
        id = graphene.ID(required=True)
        estado = graphene.String(required=True)

    suscripcion = graphene.Field(SuscripcionType)
    ok = graphene.Boolean()

    def mutate(root, info, id, estado):
        usuario = info.context.user
        if not usuario.is_authenticated:
            raise GraphQLError("Autenticación requerida.")

        suscripcion = suscripciones_visibles(usuario).filter(pk=id).first()
        if suscripcion is None:
            raise GraphQLError("Suscripción no encontrada.")
        if suscripcion.grupo_id is not None and not MembershipService.is_admin(usuario, suscripcion.grupo_id):
            raise GraphQLError("Solo un admin del grupo puede modificarla.")

        serializer = SuscripcionSerializer(
            suscripcion, data={"estado": estado}, partial=True, context={"request": info.context}
        )
        if not serializer.is_valid():
            raise GraphQLError(f"Datos inválidos: {errores_de(serializer)}")

        suscripcion = SuscripcionService.actualizar(serializer, suscripcion)
        return UpdateSuscripcionEstado(suscripcion=suscripcion, ok=True)


class Mutation(graphene.ObjectType):
    create_suscripcion = CreateSuscripcion.Field()
    update_suscripcion_estado = UpdateSuscripcionEstado.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
