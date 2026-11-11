"""Migración de datos: carga las categorías iniciales para que la app arranque lista para usar."""

from django.db import migrations

CATEGORIAS = [
    ("Streaming", "#E11D48"),
    ("Música", "#16A34A"),
    ("Software", "#2563EB"),
    ("Gimnasio", "#EA580C"),
    ("Internet y telefonía", "#0891B2"),
    ("Servicios del hogar", "#CA8A04"),
    ("Seguros", "#7C3AED"),
    ("Educación", "#0D9488"),
    ("Otros", "#64748B"),
]


def crear_categorias(apps, schema_editor):
    Categoria = apps.get_model("suscripciones", "Categoria")
    for nombre, color in CATEGORIAS:
        Categoria.objects.get_or_create(nombre=nombre, defaults={"color": color})


def borrar_categorias(apps, schema_editor):
    Categoria = apps.get_model("suscripciones", "Categoria")
    Categoria.objects.filter(nombre__in=[nombre for nombre, _ in CATEGORIAS]).delete()


class Migration(migrations.Migration):
    dependencies = [("suscripciones", "0001_initial")]

    operations = [migrations.RunPython(crear_categorias, borrar_categorias)]
