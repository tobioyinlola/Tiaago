"""Preserve bodies delivered without Content-Length by an ASGI proxy."""

from os import SEEK_END

from django.core.handlers.asgi import ASGIHandler, ASGIRequest


class SizedASGIRequest(ASGIRequest):
    def __init__(self, scope, body_file):
        super().__init__(scope, body_file)
        if "CONTENT_LENGTH" not in self.META:
            # ASGIHandler has already buffered the complete body in a seekable,
            # spooled file. DRF otherwise interprets a missing length as zero
            # and never parses JSON or multipart bodies from chunked requests.
            # Measure the existing file without reading uploads into memory.
            position = body_file.tell()
            body_file.seek(0, SEEK_END)
            self.META["CONTENT_LENGTH"] = str(body_file.tell())
            body_file.seek(position)


class BodyLengthASGIHandler(ASGIHandler):
    request_class = SizedASGIRequest
