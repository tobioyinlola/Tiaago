from collections import OrderedDict
from rest_framework.pagination import PageNumberPagination


DEFAULT_PAGE_SIZE = 20


class TiaagoPagination(PageNumberPagination):

    page_size_query_param = "page_size"

    def __init__(self, page_size=DEFAULT_PAGE_SIZE):
        self.page_size = page_size


class PaginationHandlerMixin(object):
    """Mixin to add pagination features"""

    pagination_class = TiaagoPagination

    @property
    def paginator(self):
        if not hasattr(self, "_paginator"):
            if self.pagination_class is None:
                self._paginator = None
            else:
                self._paginator = self.pagination_class()
        else:
            pass
        return self._paginator

    def paginate_queryset(self, queryset):

        if self.paginator is None:
            return None
        return self.paginator.paginate_queryset(queryset, self.request, view=self)

    def get_paginated_response(self, data):
        paginator = self.paginator
        assert paginator is not None
        previous_page = None
        next_page = None
        try:
            previous_page = paginator.page.previous_page_number()
        except:
            pass
        try:
            next_page = paginator.page.next_page_number()
        except:
            pass
        return OrderedDict(
            [
                ("current", paginator.page.number),
                ("count", paginator.page.paginator.count),
                ("next", next_page),
                ("previous", previous_page),
                ("results", data),
            ]
        )
