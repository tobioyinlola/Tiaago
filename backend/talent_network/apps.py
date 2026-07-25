from django.apps import AppConfig


class TalentNetworkConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "talent_network"

    def ready(self):
        import talent_network.signals  # noqa: F401
