import re
from datetime import date
from decimal import Decimal

import nh3
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Categoria, Etiqueta, Grupo, MembresiaGrupo, Pago, Suscripcion
from .services import HolidayService, MembershipService


def limpiar_html(valor):
    """Clase 8: elimina todas las etiquetas HTML y el contenido de las peligrosas (XSS)."""
    return nh3.clean(valor, tags=set())


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nombre", "color"]

    def validate_nombre(self, value):
        value = limpiar_html(value).strip()
        if not value:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value

    def validate_color(self, value):
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", value):
            raise serializers.ValidationError("El color debe tener el formato #RRGGBB.")
        return value.upper()


class EtiquetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Etiqueta
        fields = ["id", "nombre"]

    def validate_nombre(self, value):
        value = limpiar_html(value).strip().lower()
        if not value:
            raise serializers.ValidationError("El nombre es obligatorio.")
        usuario = self.context["request"].user
        repetida = Etiqueta.objects.filter(usuario_id=usuario.id, nombre=value)
        if self.instance:
            repetida = repetida.exclude(pk=self.instance.pk)
        if repetida.exists():
            raise serializers.ValidationError("Ya tenés una etiqueta con ese nombre.")
        return value


class SuscripcionSerializer(serializers.ModelSerializer):
    categoria_detalle = CategoriaSerializer(source="categoria", read_only=True)
    etiquetas_detalle = EtiquetaSerializer(source="etiquetas", many=True, read_only=True)
    etiquetas = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Etiqueta.objects.all(), required=False
    )
    grupo_nombre = serializers.CharField(source="grupo.nombre", read_only=True, default=None)
    costo_mensual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    dias_para_cobro = serializers.SerializerMethodField()
    cobro_en_feriado = serializers.SerializerMethodField()
    puede_editar = serializers.SerializerMethodField()

    class Meta:
        model = Suscripcion
        fields = [
            "id", "nombre", "descripcion", "categoria", "categoria_detalle",
            "etiquetas", "etiquetas_detalle", "grupo", "grupo_nombre",
            "monto", "moneda", "frecuencia", "dia_cobro", "fecha_inicio",
            "proxima_fecha_cobro", "estado", "costo_mensual", "dias_para_cobro",
            "cobro_en_feriado", "puede_editar", "creado", "actualizado",
        ]
        # El usuario y la próxima fecha los calcula el servidor, nunca vienen del cliente
        read_only_fields = ["proxima_fecha_cobro", "creado", "actualizado"]

    def _usuario(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def get_fields(self):
        campos = super().get_fields()
        usuario = self._usuario()
        if usuario is not None and getattr(usuario, "is_authenticated", False):
            # Solo se pueden asignar las etiquetas propias
            campos["etiquetas"].child_relation.queryset = Etiqueta.objects.filter(usuario_id=usuario.id)
        return campos

    def get_dias_para_cobro(self, obj):
        """Días que faltan para el cobro (negativo si está atrasado)."""
        return (obj.proxima_fecha_cobro - date.today()).days

    def get_cobro_en_feriado(self, obj):
        """Clase 5: dato calculado con la API externa de feriados."""
        return HolidayService.is_holiday(obj.proxima_fecha_cobro)

    def get_puede_editar(self, obj):
        usuario = self._usuario()
        if usuario is None:
            return False
        if obj.grupo_id is None:
            return obj.usuario_id == str(usuario.id)
        return MembershipService.is_admin(usuario, obj.grupo_id)

    def validate_nombre(self, value):
        value = limpiar_html(value).strip()
        if len(value) < 2:
            raise serializers.ValidationError("El nombre debe tener al menos 2 caracteres.")
        return value

    def validate_descripcion(self, value):
        return limpiar_html(value)

    def validate_fecha_inicio(self, value):
        if value > date.today().replace(year=date.today().year + 1):
            raise serializers.ValidationError("La fecha de inicio no puede ser dentro de más de un año.")
        return value

    def validate(self, data):
        # Validación que involucra más de un campo y el estado actual del objeto
        instancia = self.instance
        if instancia and instancia.estado == "cancelada":
            nuevo_estado = data.get("estado", instancia.estado)
            otros_campos = set(data.keys()) - {"estado"}
            if nuevo_estado == "cancelada" and otros_campos:
                raise serializers.ValidationError(
                    "No se puede editar una suscripción cancelada. Reactivala primero."
                )
        return data


class PagoSerializer(serializers.ModelSerializer):
    suscripcion_nombre = serializers.CharField(source="suscripcion.nombre", read_only=True)
    monto_en_pesos = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Pago
        fields = [
            "id", "suscripcion", "suscripcion_nombre", "fecha_pago", "fecha_cobro",
            "monto", "moneda", "cotizacion", "monto_en_pesos", "creado",
        ]
        read_only_fields = fields


class RegistrarPagoSerializer(serializers.Serializer):
    """Datos opcionales al confirmar un pago. Si no se mandan, se usan los de la suscripción."""

    fecha_pago = serializers.DateField(required=False)
    monto = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, min_value=Decimal("0.01")
    )
    cotizacion = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=Decimal("0.01")
    )

    def validate_fecha_pago(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de pago no puede ser futura.")
        return value


class MembresiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembresiaGrupo
        fields = ["id", "usuario_id", "alias", "rol"]
        read_only_fields = fields


class GrupoSerializer(serializers.ModelSerializer):
    membresias = MembresiaSerializer(many=True, read_only=True)
    mi_rol = serializers.SerializerMethodField()

    class Meta:
        model = Grupo
        fields = ["id", "nombre", "descripcion", "creado_por", "creado", "membresias", "mi_rol"]
        read_only_fields = ["creado_por", "creado"]

    def get_mi_rol(self, obj):
        usuario = self.context["request"].user
        for membresia in obj.membresias.all():
            if membresia.usuario_id == str(usuario.id):
                return membresia.rol
        return None

    def validate_nombre(self, value):
        value = limpiar_html(value).strip()
        if len(value) < 2:
            raise serializers.ValidationError("El nombre debe tener al menos 2 caracteres.")
        return value

    def validate_descripcion(self, value):
        return limpiar_html(value)


class AgregarMiembroSerializer(serializers.Serializer):
    """Clase 7 (tarea): 'usuario' es el username de Django o el email de la cuenta de Node."""

    usuario = serializers.CharField(max_length=254)
    rol = serializers.ChoiceField(choices=MembresiaGrupo.ROL_CHOICES, default="miembro")


class RegisterSerializer(serializers.ModelSerializer):
    """Clase 6: alta de cuentas propias de Django."""

    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese email.")
        return value

    def create(self, validated_data):
        # create_user guarda la contraseña hasheada, nunca en texto plano
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
