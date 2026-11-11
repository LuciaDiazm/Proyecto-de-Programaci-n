"""
Importa suscripciones desde archivos JSON, CSV y XML (misma idea que import_tasks de clase).

Uso:
    python manage.py importar_suscripciones --usuario <id_de_mongo>
    python manage.py importar_suscripciones --usuario <id> --carpeta data
"""

import csv
import json
import logging
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from suscripciones.models import Categoria, Suscripcion
from suscripciones.servicio_node import registrar_precio_en_historial

# Clase 2 (tarea): los errores quedan en import.log (ver LOGGING en settings.py)
logger = logging.getLogger("importacion")


class Command(BaseCommand):
    help = "Importa suscripciones desde múltiples formatos (JSON, CSV, XML)"

    def add_arguments(self, parser):
        parser.add_argument("--usuario", required=True, help="Id del usuario (de MongoDB) dueño de las suscripciones")
        parser.add_argument("--carpeta", default="data", help="Carpeta con los archivos a importar")

    def handle(self, *args, **options):
        self.usuario_id = options["usuario"]
        if len(self.usuario_id) != 24:
            raise CommandError("El id de usuario debe tener 24 caracteres (formato ObjectId de MongoDB).")

        carpeta = Path(options["carpeta"])
        total = 0
        total += self._import_json(carpeta / "suscripciones.json")
        total += self._import_csv(carpeta / "suscripciones.csv")
        total += self._import_xml(carpeta / "suscripciones.xml")
        total += self._import_json(carpeta / "suscripciones_proveedor_d.json")
        self.stdout.write(self.style.SUCCESS(f"Importación finalizada: {total} suscripciones cargadas"))

    def _avisar_error(self, mensaje):
        logger.error(mensaje)
        self.stderr.write(self.style.ERROR(mensaje))

    def _avisar_advertencia(self, mensaje):
        logger.warning(mensaje)
        self.stderr.write(self.style.WARNING(f"WARNING: {mensaje}"))

    def _import_json(self, path):
        count = 0
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                count += self._crear_suscripcion(item)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            self._avisar_error(f"Error importando {path}: {e}")
        return count

    def _import_csv(self, path):
        count = 0
        try:
            with open(path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    count += self._crear_suscripcion(row)
        except FileNotFoundError as e:
            self._avisar_error(f"Error importando {path}: {e}")
        return count

    def _import_xml(self, path):
        count = 0
        try:
            tree = ET.parse(path)
            for elemento in tree.getroot().findall("suscripcion"):
                # Convierte cada etiqueta hija en una clave del diccionario
                item = {hijo.tag: (hijo.text or "").strip() for hijo in elemento}
                count += self._crear_suscripcion(item)
        except (FileNotFoundError, ET.ParseError) as e:
            self._avisar_error(f"Error importando {path}: {e}")
        return count

    def _crear_suscripcion(self, item):
        """Devuelve 1 si se creó, 0 si se ignoró por datos inválidos."""
        if not item.get("nombre"):
            self._avisar_advertencia("Item sin nombre, se ignora")
            return 0

        categoria = None
        if item.get("categoria"):
            categoria, _ = Categoria.objects.get_or_create(nombre=item["categoria"])

        try:
            suscripcion = Suscripcion(
                usuario_id=self.usuario_id,
                categoria=categoria,
                nombre=item["nombre"],
                monto=item.get("monto"),
                moneda=item.get("moneda", "ARS"),
                frecuencia=item.get("frecuencia", "mensual"),
                dia_cobro=int(item.get("dia_cobro", 1)),
                fecha_inicio=date.fromisoformat(item["fecha_inicio"]) if item.get("fecha_inicio") else date.today(),
            )
            # full_clean ejecuta las validaciones del modelo (choices, mínimos, etc.)
            suscripcion.full_clean(exclude=["proxima_fecha_cobro"])
            suscripcion.save()
        except (ValidationError, ValueError) as e:
            self._avisar_advertencia(f"'{item['nombre']}' ignorada: {e}")
            return 0

        registrar_precio_en_historial(suscripcion)  # Primer precio en el historial (si Node está encendido)
        return 1
