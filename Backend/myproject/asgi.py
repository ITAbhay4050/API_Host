# """ASGI entry‑point for myproject.

# Now upgraded for Django Channels so we can handle both HTTP and WebSocket
# protocols (used for real‑time dealer‑registration notifications).
# """

# import os
# import django

# from django.core.asgi import get_asgi_application
# from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.auth import AuthMiddlewareStack

# #  Ensure settings are loaded before anything else
# os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")

# django.setup()

# # Import websocket URL patterns AFTER django.setup() so that any app‑specific
# # routing (e.g. from dealers or api) can safely interact with ORM/models.
# from myproject.routing import websocket_urlpatterns  # noqa: E402  (import after setup is intentional)

# application = ProtocolTypeRouter(
#     {
#         "http": get_asgi_application(),
#         "websocket": AuthMiddlewareStack(
#             URLRouter(websocket_urlpatterns)
#         ),
#     }
# )
