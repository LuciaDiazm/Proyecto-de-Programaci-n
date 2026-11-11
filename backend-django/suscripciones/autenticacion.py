"""
Autenticación con JWT.

Hay dos emisores de tokens y una sola identidad para el resto del sistema:
- La API de Node firma con JWT_SECRET (usuarios en MongoDB, los de la aplicación web).
  Django usa la misma clave para verificar: no hace falta consultar a Node.
- simplejwt (Clase 6) firma con SECRET_KEY para las cuentas propias de Django y las de Google.

En ambos casos request.user termina siendo un UsuarioToken, cuyo id es el que se guarda
en usuario_id. Los usuarios de Django se identifican como "dj-<pk>".
"""

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


class UsuarioToken:
    """Usuario armado a partir de los datos del token (no se guarda en la base)."""

    is_authenticated = True
    is_anonymous = False

    def __init__(self, payload):
        self.id = str(payload["id"])
        self.pk = self.id  # Lo necesita UserRateThrottle para contar por usuario
        self.rol = payload.get("rol", "USUARIO")
        self.alias = payload.get("nombre") or payload.get("email") or self.id

    @classmethod
    def desde_django(cls, user):
        return cls({
            "id": f"dj-{user.pk}",
            "rol": "ADMIN" if user.is_staff else "USUARIO",
            "nombre": user.get_username(),
            "email": user.email,
        })

    @property
    def es_admin(self):
        return self.rol == "ADMIN"

    def __str__(self):
        return f"Usuario {self.id} ({self.rol})"


def decodificar_token_node(token):
    """Devuelve el payload si el token lo firmó Node. Lanza jwt.InvalidTokenError si no."""
    if not settings.JWT_SECRET:
        raise jwt.InvalidTokenError("JWT_SECRET sin configurar")
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=["HS256"],  # Fijamos el algoritmo: no aceptamos tokens "alg: none"
        issuer=settings.JWT_ISSUER,
        options={"require": ["exp", "id", "iss"]},
    )


def usuario_desde_token(token):
    """Para WebSocket y GraphQL: traduce un token crudo a UsuarioToken, o None si no sirve."""
    try:
        return UsuarioToken(decodificar_token_node(token))
    except jwt.InvalidTokenError:
        pass
    User = get_user_model()
    try:
        access = AccessToken(token)
        return UsuarioToken.desde_django(User.objects.get(id=access["user_id"], is_active=True))
    except (TokenError, KeyError, ValueError, User.DoesNotExist):
        return None


class JWTNodeAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return None  # Sin token: DRF responde 401 por IsAuthenticated

        token = auth_header.split(" ", 1)[1]

        try:
            payload = decodificar_token_node(token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("El token ha expirado. Inicie sesión nuevamente")
        except jwt.InvalidTokenError:
            return None  # Puede ser de simplejwt: decide la siguiente clase de autenticación

        return (UsuarioToken(payload), token)

    def authenticate_header(self, request):
        # Hace que DRF responda 401 (y no 403) cuando falta el token
        return "Bearer"


class JWTDjangoAuthentication(JWTAuthentication):
    """Clase 6: token de simplejwt. Si el token no sirve, responde 401."""

    def authenticate(self, request):
        resultado = super().authenticate(request)
        if resultado is None:
            return None
        user, token = resultado
        return (UsuarioToken.desde_django(user), token)
