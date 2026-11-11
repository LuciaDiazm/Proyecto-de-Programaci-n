from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """Clase 8: el login se limita por IP porque todavía no hay un usuario autenticado."""

    scope = "login"

    def get_cache_key(self, request, view):
        ip = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ip}
