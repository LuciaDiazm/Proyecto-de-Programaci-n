from graphene_django.views import GraphQLView

from .autenticacion import usuario_desde_token


class JWTGraphQLView(GraphQLView):
    """
    Clase 11. GraphQLView es una vista común de Django, no de DRF:
    no lee el header Authorization por su cuenta, así que lo hacemos acá.
    """

    def dispatch(self, request, *args, **kwargs):
        encabezado = request.headers.get("Authorization", "")
        if encabezado.startswith("Bearer "):
            usuario = usuario_desde_token(encabezado.split(" ", 1)[1])
            if usuario is not None:
                request.user = usuario
        return super().dispatch(request, *args, **kwargs)
