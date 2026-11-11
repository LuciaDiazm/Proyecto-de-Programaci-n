from django.contrib import admin
from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from suscripciones.graphql_views import JWTGraphQLView
from suscripciones.views import RegisterView, SocialLoginJWTView, ThrottledTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("suscripciones.urls")),
    # Clase 6: cuentas propias de Django con access + refresh
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    # Clase 7: login con Google y canje de la sesión por JWT
    path("accounts/", include("allauth.urls")),
    path("api/auth/social/jwt/", SocialLoginJWTView.as_view(), name="social_jwt"),
    # Clase 11: GraphQL con la interfaz GraphiQL
    path("graphql/", csrf_exempt(JWTGraphQLView.as_view(graphiql=True))),
]
