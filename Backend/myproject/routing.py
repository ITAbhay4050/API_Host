# """WebSocket URL routes for Django Channels.

# Import this in `myproject.asgi` as `websocket_urlpatterns`.
# """

# from django.urls import re_path
# from api.consumers import NotificationConsumer  # adjust path if you place consumer elsewhere

# websocket_urlpatterns = [
#     # ws://127.0.0.1:8000/ws/notifications/company/<company_id>/
#     re_path(r"ws/notifications/company/(?P<company_id>\d+)/$", NotificationConsumer.as_asgi()),
# ]
