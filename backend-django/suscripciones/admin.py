from django.contrib import admin

from .models import Categoria, Etiqueta, Grupo, MembresiaGrupo, Pago, SecurityLog, Suscripcion


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "color"]
    search_fields = ["nombre"]


class PagoInline(admin.TabularInline):
    model = Pago
    extra = 0


@admin.register(Suscripcion)
class SuscripcionAdmin(admin.ModelAdmin):
    list_display = ["nombre", "monto", "moneda", "frecuencia", "proxima_fecha_cobro", "estado", "usuario_id", "grupo"]
    list_filter = ["estado", "moneda", "frecuencia", "categoria"]
    search_fields = ["nombre", "usuario_id"]
    inlines = [PagoInline]


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ["suscripcion", "fecha_pago", "monto", "moneda", "cotizacion"]
    list_filter = ["moneda"]


class MembresiaInline(admin.TabularInline):
    model = MembresiaGrupo
    extra = 0


@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "creado_por", "creado"]
    search_fields = ["nombre"]
    inlines = [MembresiaInline]


@admin.register(Etiqueta)
class EtiquetaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "usuario_id"]
    search_fields = ["nombre"]


@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "action", "usuario_id", "detail", "ip_address"]
    list_filter = ["action"]
    search_fields = ["detail", "usuario_id"]
