from rest_framework.pagination import PageNumberPagination


class PaginacionEstandar(PageNumberPagination):
    """Clase 5: ?page=2 y, opcionalmente, ?page_size=50 (con un tope para evitar abusos)."""

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100
