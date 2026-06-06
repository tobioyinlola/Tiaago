from rest_framework import routers

from .views import RoleViewSet

router = routers.SimpleRouter()

router.register(r"roles", RoleViewSet)