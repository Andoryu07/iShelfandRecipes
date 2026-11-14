import pytest

from application.emails import sending
from application.emails.messages import passwordResetEmail
from application.emails.sending import SmtpEmailSender


class FakeSmtp:
    instances: list["FakeSmtp"] = []

    def __init__(self, host: str, port: int, timeout: int) -> None:
        self.address = (host, port)
        self.calls: list[str] = []
        self.messages = []
        FakeSmtp.instances.append(self)

    def __enter__(self) -> "FakeSmtp":
        return self

    def __exit__(self, *arguments) -> None:
        self.calls.append("quit")

    def starttls(self) -> None:
        self.calls.append("starttls")

    def login(self, username: str, password: str) -> None:
        self.calls.append(f"login {username}")

    def send_message(self, message) -> None:
        self.calls.append("send")
        self.messages.append(message)


def test_smtpSenderUsesTlsLoginAndHeaders(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeSmtp.instances.clear()
    monkeypatch.setattr(sending.smtplib, "SMTP", FakeSmtp)
    sender = SmtpEmailSender("smtp-relay.example", 587, "user", "key", "iShelf <noreply@ishelf.cz>", "help@ishelf.cz")

    sender.send(passwordResetEmail("anna@example.com", "https://ishelf.cz/reset-password#token=abc"))

    connection = FakeSmtp.instances[0]
    assert connection.address == ("smtp-relay.example", 587)
    assert connection.calls == ["starttls", "login user", "send", "quit"]
    message = connection.messages[0]
    assert message["From"] == "iShelf <noreply@ishelf.cz>"
    assert message["To"] == "anna@example.com"
    assert message["Reply-To"] == "help@ishelf.cz"
    assert message["Subject"] == "Obnova hesla do iShelf"
    assert "https://ishelf.cz/reset-password#token=abc" in message.get_body(("plain",)).get_content()
    assert 'href="https://ishelf.cz/reset-password#token=abc"' in message.get_body(("html",)).get_content()


def test_failedSendingIsLoggedNotRaised(caplog: pytest.LogCaptureFixture) -> None:
    class BrokenSender:
        def send(self, email) -> None:
            raise OSError("connection refused")

    sending.sendSafely(BrokenSender(), passwordResetEmail("anna@example.com", "https://ishelf.cz/x"))

    assert "Sending an e-mail to anna@example.com failed" in caplog.text
