import io
import json
import tempfile

from asgiref.testing import ApplicationCommunicator
from django.test import SimpleTestCase, override_settings
from django.urls import path
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from talentsync_backend.http_asgi import BodyLengthASGIHandler, SizedASGIRequest


class EchoCheckout(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        return Response({"amount": request.data.get("amount")})


urlpatterns = [path("checkout/", EchoCheckout.as_view())]


def scope(headers=()):
    return {
        "type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1",
        "method": "POST", "path": "/checkout/", "query_string": b"",
        "headers": list(headers), "server": ("testserver", 80), "client": ("127.0.0.1", 1234),
    }


class ChunkedBodyTests(SimpleTestCase):
    def test_json_without_content_length_is_parsed(self):
        body = json.dumps({"amount": 50, "note": "Naira ₦"}).encode()
        request = SizedASGIRequest(scope([(b"content-type", b"application/json")]), io.BytesIO(body))
        self.assertEqual(request.META["CONTENT_LENGTH"], str(len(body)))
        self.assertEqual(Request(request, parsers=[JSONParser()]).data["amount"], 50)

    def test_multipart_without_content_length_preserves_fields_and_file_bytes(self):
        body = (b'--qa\r\nContent-Disposition: form-data; name="amount"\r\n\r\n50\r\n'
                b'--qa\r\nContent-Disposition: form-data; name="file"; filename="qa.bin"\r\n'
                b'Content-Type: application/octet-stream\r\n\r\n\x00\xff\x10\r\n--qa--\r\n')
        with tempfile.SpooledTemporaryFile(max_size=1) as stream:
            stream.write(body)
            stream.seek(0)
            request = SizedASGIRequest(scope([(b"content-type", b"multipart/form-data; boundary=qa")]), stream)
            self.assertEqual(stream.tell(), 0)
            parsed = Request(request, parsers=[MultiPartParser()])
            self.assertEqual(parsed.data["amount"], "50")
            self.assertEqual(parsed.FILES["file"].read(), b"\x00\xff\x10")

    def test_explicit_content_length_is_preserved(self):
        request = SizedASGIRequest(scope([(b"content-length", b"0")]), io.BytesIO(b"{}"))
        self.assertEqual(request.META["CONTENT_LENGTH"], "0")

    def test_empty_body_remains_empty(self):
        request = SizedASGIRequest(scope(), io.BytesIO())
        self.assertEqual(request.META["CONTENT_LENGTH"], "0")
        self.assertEqual(Request(request, parsers=[JSONParser()]).data, {})

    @override_settings(ROOT_URLCONF=__name__, SECURE_SSL_REDIRECT=False)
    async def test_asgi_handler_accepts_multiple_body_chunks_without_length(self):
        app = ApplicationCommunicator(BodyLengthASGIHandler(), scope([
            (b"host", b"testserver"), (b"content-type", b"application/json"),
        ]))
        await app.send_input({"type": "http.request", "body": b'{"amount":', "more_body": True})
        await app.send_input({"type": "http.request", "body": b'50}', "more_body": False})
        start = await app.receive_output(timeout=5)
        self.assertEqual(start["status"], 200)
        response = await app.receive_output(timeout=5)
        self.assertEqual(json.loads(response["body"]), {"amount": 50})
        await app.wait(timeout=5)
