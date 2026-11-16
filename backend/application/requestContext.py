import re
from contextvars import ContextVar

currentRequest: ContextVar[tuple[str, str] | None] = ContextVar("currentRequest", default=None)
changingMethods = {"POST", "PUT", "PATCH", "DELETE"}
allowedInLockedHousehold = [
    ("DELETE", re.compile(r"/households/\d+/members/\d+$")),
    ("PATCH", re.compile(r"/households/\d+/notification-settings$")),
    ("POST", re.compile(r"/join-requests/\d+/reject$")),
    ("DELETE", re.compile(r"/invite-links/\d+$")),
]


def requestChangesData() -> bool:
    request = currentRequest.get()
    if request is None:
        return False
    method, path = request
    if method not in changingMethods:
        return False
    return not any(method == allowedMethod and pattern.search(path) for allowedMethod, pattern in allowedInLockedHousehold)
