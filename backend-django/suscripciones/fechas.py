"""
Cálculo de fechas de cobro recurrentes.

El problema: si una suscripción se cobra el día 31, ¿qué pasa en febrero o en
abril? La regla que usamos es la misma que usan los bancos: si el mes no tiene
ese día, se cobra el último día del mes.

El detalle importante es calcular siempre a partir del DÍA DE COBRO original y
no de la fecha anterior. Si no, después de febrero (28) todos los cobros
quedarían corridos al 28 para siempre.
"""

import calendar
from datetime import date

MESES_POR_FRECUENCIA = {
    "mensual": 1,
    "trimestral": 3,
    "anual": 12,
}


def ajustar_dia(anio, mes, dia_cobro):
    """Devuelve la fecha del mes pedido, usando el último día si el mes es más corto."""
    ultimo_dia = calendar.monthrange(anio, mes)[1]
    return date(anio, mes, min(dia_cobro, ultimo_dia))


def sumar_meses(fecha, meses, dia_cobro):
    """Suma meses a una fecha respetando el día de cobro original."""
    indice_mes = fecha.month - 1 + meses
    anio = fecha.year + indice_mes // 12
    mes = indice_mes % 12 + 1
    return ajustar_dia(anio, mes, dia_cobro)


def primera_fecha_cobro(desde, dia_cobro):
    """
    Primer cobro a partir de una fecha: este mes si el día todavía no pasó,
    o el mes siguiente si ya pasó.
    """
    candidata = ajustar_dia(desde.year, desde.month, dia_cobro)
    if candidata >= desde:
        return candidata
    return sumar_meses(desde, 1, dia_cobro)


def siguiente_fecha_cobro(fecha_actual, frecuencia, dia_cobro):
    """Fecha del cobro que sigue a 'fecha_actual' según la frecuencia."""
    return sumar_meses(fecha_actual, MESES_POR_FRECUENCIA[frecuencia], dia_cobro)


def proximo_cobro_desde(fecha_inicio, frecuencia, dia_cobro, hoy=None):
    """
    Próximo cobro a partir de hoy para una suscripción que empezó en 'fecha_inicio'.
    Si empezó hace tiempo, se avanza período por período (así una anual que empezó
    en enero sigue cobrándose en enero, y no este mes).
    """
    hoy = hoy or date.today()
    fecha = primera_fecha_cobro(fecha_inicio, dia_cobro)
    while fecha < hoy:
        fecha = siguiente_fecha_cobro(fecha, frecuencia, dia_cobro)
    return fecha
