from datetime import date

from suscripciones.fechas import primera_fecha_cobro, proximo_cobro_desde, siguiente_fecha_cobro


def test_dia_31_en_febrero_usa_el_ultimo_dia():
    assert siguiente_fecha_cobro(date(2026, 1, 31), "mensual", 31) == date(2026, 2, 28)


def test_despues_de_febrero_vuelve_al_dia_31():
    # Si calculáramos desde el 28 de febrero, quedaría el 28 de marzo (error típico)
    assert siguiente_fecha_cobro(date(2026, 2, 28), "mensual", 31) == date(2026, 3, 31)


def test_anio_bisiesto():
    assert siguiente_fecha_cobro(date(2028, 1, 30), "mensual", 30) == date(2028, 2, 29)


def test_cambio_de_anio():
    assert siguiente_fecha_cobro(date(2026, 12, 10), "mensual", 10) == date(2027, 1, 10)


def test_trimestral_y_anual():
    assert siguiente_fecha_cobro(date(2026, 11, 30), "trimestral", 30) == date(2027, 2, 28)
    assert siguiente_fecha_cobro(date(2028, 2, 29), "anual", 29) == date(2029, 2, 28)


def test_primera_fecha_cobro():
    assert primera_fecha_cobro(date(2026, 10, 6), 15) == date(2026, 10, 15)
    assert primera_fecha_cobro(date(2026, 10, 20), 15) == date(2026, 11, 15)
    assert primera_fecha_cobro(date(2026, 10, 15), 15) == date(2026, 10, 15)


def test_suscripcion_antigua_avanza_hasta_hoy():
    hoy = date(2026, 10, 6)
    assert proximo_cobro_desde(date(2023, 5, 10), "mensual", 10, hoy) == date(2026, 10, 10)
    assert proximo_cobro_desde(date(2023, 5, 10), "mensual", 1, hoy) == date(2026, 11, 1)
    # Una anual que empezó en enero se sigue cobrando en enero
    assert proximo_cobro_desde(date(2025, 1, 31), "anual", 31, hoy) == date(2027, 1, 31)
    assert proximo_cobro_desde(date(2026, 10, 6), "mensual", 6, hoy) == date(2026, 10, 6)
