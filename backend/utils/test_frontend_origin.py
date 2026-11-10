"""Job links follow the frontend host the user is on, but only trusted ones."""
from django.test import RequestFactory, SimpleTestCase, override_settings

from utils.frontend_origin import frontend_base_url


@override_settings(
    FRONTEND_URL="https://www.tiaago.com/",
    FRONTEND_BASE_URL="https://www.tiaago.com",
    CSRF_TRUSTED_ORIGINS=["https://app.tiaago.com"],
    CORS_ALLOWED_ORIGINS=["http://localhost:3000"],
    FRONTEND_EXTRA_ORIGINS=[],
)
class FrontendBaseUrlTests(SimpleTestCase):
    def _base(self, origin=None):
        extra = {"HTTP_X_FRONTEND_ORIGIN": origin} if origin is not None else {}
        return frontend_base_url(RequestFactory().get("/", **extra))

    def test_defaults_to_the_configured_frontend_url(self):
        self.assertEqual(self._base(), "https://www.tiaago.com")
        self.assertEqual(frontend_base_url(None), "https://www.tiaago.com")

    def test_the_bare_and_www_variants_of_a_trusted_host_are_honoured(self):
        self.assertEqual(self._base("https://tiaago.com"), "https://tiaago.com")
        self.assertEqual(self._base("https://www.tiaago.com"), "https://www.tiaago.com")
        self.assertEqual(self._base("https://app.tiaago.com"), "https://app.tiaago.com")
        self.assertEqual(self._base("HTTP://LOCALHOST:3000"), "http://localhost:3000")

    @override_settings(FRONTEND_EXTRA_ORIGINS=["https://preview.example.org"])
    def test_extra_origins_can_be_added_by_configuration(self):
        self.assertEqual(self._base("https://preview.example.org"), "https://preview.example.org")

    def test_untrusted_or_malformed_origins_fall_back_to_the_default(self):
        for forged in (
            "https://evil.example.com",
            "https://tiaago.com.evil.example.com",
            "https://tiaago.com@evil.example.com",
            "javascript:alert(1)",
            "//evil.example.com",
            "not a url",
            "",
        ):
            self.assertEqual(self._base(forged), "https://www.tiaago.com", forged)

    def test_a_path_on_the_origin_is_ignored(self):
        self.assertEqual(self._base("https://tiaago.com/steal"), "https://tiaago.com")
