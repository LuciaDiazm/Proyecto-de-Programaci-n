from datetime import date, timedelta

from django.contrib.auth.models import User
from django.db.models import ProtectedError, Q
from django.http import JsonResponse
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .permisos import EsAdminDelGrupoOSoloLectura, EsAdminOSoloLectura, TieneApiKeyInterna
from .repositories import (
    CategoriaRepository,
    EtiquetaRepository,
    PagoRepository,
    SuscripcionRepository,
)
from .serializers import (
    AgregarMiembroSerializer,
    CategoriaSerializer,
    EtiquetaSerializer,
    GrupoSerializer,
    MembresiaSerializer,
    PagoSerializer,
    RegisterSerializer,
    RegistrarPagoSerializer,
    SuscripcionSerializer,
)
from .services import (
    AuditoriaService,
    GrupoService,
    HolidayService,
    MembershipService,
    PagoService,
    SuscripcionService,
)
from .servicio_node import buscar_usuario_por_email
from .throttles import LoginRateThrottle

VERSION_API = "1.0.0"


def health_check(request):
    return JsonResponse({"status": "ok", "service": "Al Día - API de suscripciones (Django)"})


def health_version(request):
    """Clase 1 (tarea)."""
    return JsonResponse({"version": VERSION_API})


def leer_entero(request, nombre, por_defecto, minimo, maximo):
    """Lee un parámetro numérico de la URL (?dias=30) y valida el rango."""
    valor = request.query_params.get(nombre, por_defecto)
    try:
        valor = int(valor)
    except (TypeError, ValueError):
        raise ValidationError({nombre: "Debe ser un número entero."})
    if not minimo <= valor <= maximo:
        raise ValidationError({nombre: f"Debe estar entre {minimo} y {maximo}."})
    return valor


class RegisterView(generics.CreateAPIView):
    """Clase 6: alta pública de cuentas de Django."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Clase 8: login con límite estricto y registro de los intentos fallidos."""

    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except AuthenticationFailed:
            username = request.data.get("username", "")
            AuditoriaService.registrar("login_failed", request, f"usuario={username}")
            raise


class SocialLoginJWTView(APIView):
    """Clase 7: después del login con Google, canjea la sesión de allauth por un par de JWT."""

    authentication_classes = [SessionAuthentication]

    def get(self, request):
        refresh = RefreshToken.for_user(request.user)
        return Response({"refresh": str(refresh), "access": str(refresh.access_token)})


class FeriadosView(APIView):
    """Clase 5: feriados nacionales del año, con la caché de HolidayService."""

    def get(self, request):
        anio = leer_entero(request, "anio", date.today().year, 2000, 2100)
        return Response({"anio": anio, "feriados": HolidayService.get_holidays(anio)})


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaRepository.get_queryset()
    serializer_class = CategoriaSerializer
    permission_classes = [EsAdminOSoloLectura]
    pagination_class = None  # Catálogo chico que el frontend carga completo
    search_fields = ["nombre"]
    ordering_fields = ["nombre"]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": True, "detail": "No se puede borrar: hay suscripciones con esta categoría."},
                status=status.HTTP_409_CONFLICT,
            )


class EtiquetaViewSet(viewsets.ModelViewSet):
    serializer_class = EtiquetaSerializer
    pagination_class = None

    def get_queryset(self):
        return EtiquetaRepository.del_usuario(self.request.user.id)

    def perform_create(self, serializer):
        serializer.save(usuario_id=self.request.user.id)


class SuscripcionViewSet(viewsets.ModelViewSet):
    queryset = SuscripcionRepository.get_queryset()
    serializer_class = SuscripcionSerializer
    permission_classes = [IsAuthenticated, EsAdminDelGrupoOSoloLectura]
    filterset_fields = ["estado", "categoria", "moneda", "frecuencia", "grupo", "etiquetas"]
    search_fields = ["nombre", "descripcion"]
    ordering_fields = ["proxima_fecha_cobro", "monto", "nombre", "creado"]
    ordering = ["proxima_fecha_cobro", "nombre"]

    def get_queryset(self):
        # Visibilidad (Clase 7): el id sale del token, nunca de la URL
        usuario_id = self.request.user.id
        queryset = SuscripcionRepository.visibles_para(usuario_id)
        parametros = self.request.query_params

        if self.action == "list":
            if parametros.get("solo_propias") == "true":
                queryset = SuscripcionRepository.propias(queryset, usuario_id)
            if not parametros.get("estado") and parametros.get("incluir_canceladas") != "true":
                queryset = queryset.exclude(estado="cancelada")

        return queryset

    def _propias(self):
        return SuscripcionRepository.propias(self.get_queryset(), self.request.user.id)

    def _verificar_admin_del_grupo(self, grupo):
        # has_object_permission no corre al crear: hay que chequear el rol a mano (Clase 7)
        if grupo is not None and not MembershipService.is_admin(self.request.user, grupo):
            AuditoriaService.registrar("permission_denied", self.request, f"grupo={grupo.pk}")
            raise PermissionDenied("Solo un admin del grupo puede crear o mover suscripciones en él.")

    def perform_create(self, serializer):
        self._verificar_admin_del_grupo(serializer.validated_data.get("grupo"))
        SuscripcionService.crear(serializer, self.request.user)

    def perform_update(self, serializer):
        if "grupo" in serializer.validated_data:
            self._verificar_admin_del_grupo(serializer.validated_data["grupo"])
        SuscripcionService.actualizar(serializer, self.get_object())

    def destroy(self, request, *args, **kwargs):
        suscripcion = SuscripcionService.cancelar(self.get_object())
        return Response(self.get_serializer(suscripcion).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def proximos(self, request):
        """Cobros propios de los próximos N días (por defecto 30), incluidos los atrasados."""
        dias = leer_entero(request, "dias", 30, 1, 365)
        queryset = SuscripcionService.proximas(self._propias(), dias)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        datos = SuscripcionService.resumen(self._propias())
        proxima = datos["proximo_cobro"]
        datos["proximo_cobro"] = self.get_serializer(proxima).data if proxima else None
        return Response(datos)

    @action(detail=True, methods=["post"], url_path="registrar-pago")
    def registrar_pago(self, request, pk=None):
        suscripcion = self.get_object()
        datos = RegistrarPagoSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        pago = SuscripcionService.registrar_pago(suscripcion, datos.validated_data)
        return Response(
            {"pago": PagoSerializer(pago).data, "suscripcion": self.get_serializer(suscripcion).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def pagos(self, request, pk=None):
        suscripcion = self.get_object()
        return Response(PagoSerializer(suscripcion.pagos.all(), many=True).data)


class PagoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PagoSerializer
    filterset_fields = ["moneda", "suscripcion"]
    ordering_fields = ["fecha_pago", "monto"]

    def get_queryset(self):
        return PagoRepository.del_usuario(self.request.user.id)

    @action(detail=False, methods=["get"], url_path="por-mes")
    def por_mes(self, request):
        meses = leer_entero(request, "meses", 6, 1, 24)
        return Response(PagoService.total_por_mes(self.get_queryset(), meses))


class GrupoViewSet(viewsets.ModelViewSet):
    """Clase 7: grupos con roles. Quien lo crea queda como admin."""

    serializer_class = GrupoSerializer
    permission_classes = [IsAuthenticated, EsAdminDelGrupoOSoloLectura]
    search_fields = ["nombre"]
    ordering_fields = ["id", "nombre"]

    def get_queryset(self):
        return MembershipService.grupos_para(self.request.user)

    def perform_create(self, serializer):
        GrupoService.crear(serializer, self.request.user)

    def _resolver_usuario(self, identificador):
        """Busca primero una cuenta de Django y después una de Node (por email)."""
        cuenta = User.objects.filter(Q(username=identificador) | Q(email__iexact=identificador)).first()
        if cuenta is not None:
            return f"dj-{cuenta.pk}", cuenta.get_username()
        encontrado = buscar_usuario_por_email(identificador)
        if encontrado is not None:
            return str(encontrado["id"]), encontrado.get("nombre") or encontrado.get("email", "")
        raise NotFound("No existe un usuario con ese nombre o email.")

    @action(detail=True, methods=["post"], url_path="add-member")
    def add_member(self, request, pk=None):
        """Clase 7 (tarea). get_object ejecuta has_object_permission: exige ser admin del grupo."""
        grupo = self.get_object()
        datos = AgregarMiembroSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        usuario_id, alias = self._resolver_usuario(datos.validated_data["usuario"])
        membresia = GrupoService.agregar_miembro(grupo, usuario_id, alias, datos.validated_data["rol"])
        return Response(MembresiaSerializer(membresia).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def summary(self, request, pk=None):
        """Clase 5 (tarea): cantidad de suscripciones por estado."""
        return Response(GrupoService.resumen(self.get_object()))


class ProximosCobrosInternoView(APIView):
    """
    Solo para la API de Node (protegida con X-API-KEY, sin JWT).
    Node la consulta periódicamente para generar las notificaciones.
    """

    authentication_classes = []
    permission_classes = [TieneApiKeyInterna]
    throttle_classes = []  # La llama otro servidor nuestro, no un cliente anónimo

    def get(self, request):
        dias = leer_entero(request, "dias", 7, 0, 60)
        limite = date.today() + timedelta(days=dias)
        suscripciones = SuscripcionRepository.activas_hasta(limite).values(
            "id", "usuario_id", "nombre", "monto", "moneda", "proxima_fecha_cobro"
        )
        return Response(list(suscripciones))
