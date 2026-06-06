from logging import Logger
import requests
import uuid


class LoggingSession(requests.Session):

    def __init__(self, logger: Logger = None):
        self.logger = logger
        super().__init__()

    def send(self, request, **kwargs):
        identifier = str(uuid.uuid4())
        if self.logger:
            self.logger.debug(f"[id:{identifier}] Request URL: {request.url}")
            self.logger.debug(f"[id:{identifier}] Request method: {request.method}")
            self.logger.debug(f"[id:{identifier}] Request body: {request.body}\n")

        response = super(LoggingSession, self).send(request, **kwargs)
        if self.logger:
            self.logger.debug(
                f"[id:{identifier}] Response status code: {response.status_code}"
            )
            self.logger.debug(
                f"[id:{identifier}] Response content: {response.content}\n\n\n"
            )

        return response


class APIHandler:
    def __init__(self, logger: Logger = None):
        self.requests = LoggingSession(logger)
