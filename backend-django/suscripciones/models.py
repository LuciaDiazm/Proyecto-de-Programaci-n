from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from .fechas import MESES_POR_FRECUENCIA, proximo_cobro_desde


class Categoria(models.Model):
    """Categorías globales (Streaming, Música, Gimnasio...). Solo un ADMIN las modifica."""

    nombre = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#6366F1")  # Color en formato #RRGGBB

    class Meta:
        ordering = ["nombre"]
        verbose_name_plural = "categorías"

    def __str__(self):
        return self.nombre


class Etiqueta(models.Model):
    """Clase 3 (relación muchos a muchos): cada usuario arma sus etiquetas, como 'trabajo' o 'familia'."""

    usuario_id = models.CharField(max_length=24, db_index=True)
    nombre = models.CharField(max_length=30)

    class Meta:
        ordering = ["nombre"]
        constraints = [
            models.UniqueConstraint(fields=["usuario_id", "nombre"], name="etiqueta_unica_por_usuario"),
        ]

    def __str__(self):
        return self.nombre


class Grupo(models.Model):
    """Clase 7: espacio compartido (familia, depto) con sus propios miembros y roles."""

    nombre = models.CharField(max_length=80)
    descripcion = models.TextField(blank=True)
    creado_por = models.CharField(max_length=24)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.nombre


class MembresiaGrupo(models.Model):
    """Rol de un usuario DENTRO de un grupo (RBAC por recurso, no global)."""

    ROL_CHOICES = [("admin", "Administrador"), ("miembro", "Miembro")]

    grupo = models.ForeignKey(Grupo, on_delete=models.CASCADE, related_name="membresias")
    usuario_id = models.CharField(max_length=24, db_index=True)
    alias = models.CharField(max_length=120, blank=True)  # Nombre o email para mostrar
    rol = models.CharField(max_length=10, choices=ROL_CHOICES, default="miembro")

    class Meta:
        verbose_name_plural = "membresías de grupo"
        # La base es la última línea de defensa: nadie es miembro dos veces del mismo grupo
        constraints = [
            models.UniqueConstraint(fields=["grupo", "usuario_id"], name="membresia_unica"),
        ]

    def __str__(self):
        return f"{self.alias or self.usuario_id} - {self.grupo} ({self.rol})"


class Suscripcion(models.Model):
    MONEDA_CHOICES = [("ARS", "Pesos"), ("USD", "Dólares")]
    FRECUENCIA_CHOICES = [
        ("mensual", "Mensual"),
        ("trimestral", "Trimestral"),
        ("anual", "Anual"),
    ]
    ESTADO_CHOICES = [
        ("activa", "Activa"),
        ("pausada", "Pausada"),
        ("cancelada", "Cancelada"),
    ]

    # El usuario vive en MongoDB (API de Node). Acá guardamos su id, que viene en el JWT.
    usuario_id = models.CharField(max_length=24, db_index=True)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,  # No se puede borrar una categoría que está en uso
        related_name="suscripciones",
        null=True,
        blank=True,
    )
    grupo = models.ForeignKey(
        Grupo,
        on_delete=models.SET_NULL,  # Si se borra el grupo, la suscripción vuelve a ser personal
        related_name="suscripciones",
        null=True,
        blank=True,
    )
    etiquetas = models.ManyToManyField(Etiqueta, related_name="suscripciones", blank=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    monto = models.DecimalField(
        max_digits=12,
        decimal_places=2,  # La plata siempre en Decimal, nunca en float
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    moneda = models.CharField(max_length=3, choices=MONEDA_CHOICES, default="ARS")
    frecuencia = models.CharField(max_length=10, choices=FRECUENCIA_CHOICES, default="mensual")
    dia_cobro = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(31)]
    )
    fecha_inicio = models.DateField(default=date.today)
    proxima_fecha_cobro = models.DateField()
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default="activa")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["proxima_fecha_cobro", "nombre"]
        verbose_name_plural = "suscripciones"

    def __str__(self):
        return f"{self.nombre} ({self.monto} {self.moneda})"

    @property
    def costo_mensual(self):
        """Cuánto representa por mes (una anual de 12.000 son 1.000 por mes)."""
        meses = MESES_POR_FRECUENCIA[self.frecuencia]
        return (self.monto / meses).quantize(Decimal("0.01"))

    def save(self, *args, **kwargs):
        if not self.proxima_fecha_cobro:
            self.proxima_fecha_cobro = proximo_cobro_desde(self.fecha_inicio, self.frecuencia, self.dia_cobro)
        super().save(*args, **kwargs)


class Pago(models.Model):
    """Cada cobro que el usuario confirma. Permite ver cuánto gastó realmente por mes."""

    suscripcion = models.ForeignKey(Suscripcion, on_delete=models.CASCADE, related_name="pagos")
    fecha_pago = models.DateField(default=date.today)
    fecha_cobro = models.DateField()  # El vencimiento que cubre este pago
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    moneda = models.CharField(max_length=3, choices=Suscripcion.MONEDA_CHOICES)
    # Si se pagó en dólares, cotización usada para pasarlo a pesos
    cotizacion = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha_pago", "-id"]

    def __str__(self):
        return f"{self.suscripcion.nombre} - {self.fecha_pago}"

    @property
    def monto_en_pesos(self):
        if self.moneda == "USD" and self.cotizacion:
            return (self.monto * self.cotizacion).quantize(Decimal("0.01"))
        if self.moneda == "ARS":
            return self.monto
        return None


class SecurityLog(models.Model):
    """Clase 8: auditoría de eventos sensibles. Nunca se guardan contraseñas ni tokens."""

    # SET_NULL: si se borra la cuenta, el registro de auditoría se conserva
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    usuario_id = models.CharField(max_length=24, blank=True)  # Para usuarios que viven en Node
    action = models.CharField(max_length=100)  # ej: "login_failed", "permission_denied"
    detail = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.action} ({self.ip_address})"
