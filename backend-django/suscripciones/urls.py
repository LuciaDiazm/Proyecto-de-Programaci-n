from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"categorias", views.CategoriaViewSet, basename="categoria")
router.register(r"etiquetas", views.EtiquetaViewSet, basename="etiqueta")
router.register(r"suscripciones", views.SuscripcionViewSet, basename="suscripcion")
router.register(r"pagos", views.PagoViewSet, basename="pago")
router.register(r"grupos", views.GrupoViewSet, basename="grupo")

urlpatterns = [
    path("health/", views.health_check, name="health_check"),
    path("health/version/", views.health_version, name="health_version"),
    path("feriados/", views.FeriadosView.as_view(), name="feriados"),
    path("internos/proximos-cobros/", views.ProximosCobrosInternoView.as_view(), name="proximos_internos"),
    path("", include(router.urls)),
]
