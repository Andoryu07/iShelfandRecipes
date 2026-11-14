import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol

from application.configuration import getConfiguration

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Email:
    recipient: str
    subject: str
    text: str
    html: str


class EmailSender(Protocol):
    def send(self, email: Email) -> None: ...


class SmtpEmailSender:
    def __init__(
        self, host: str, port: int, username: str | None, password: str | None, sender: str, replyTo: str | None
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.sender = sender
        self.replyTo = replyTo

    def send(self, email: Email) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = email.recipient
        message["Subject"] = email.subject
        if self.replyTo:
            message["Reply-To"] = self.replyTo
        message.set_content(email.text)
        message.add_alternative(email.html, subtype="html")
        with smtplib.SMTP(self.host, self.port, timeout=30) as connection:
            connection.starttls()
            if self.username and self.password:
                connection.login(self.username, self.password)
            connection.send_message(message)


class ConsoleEmailSender:
    def send(self, email: Email) -> None:
        logger.warning(
            "SMTP is not configured, e-mail to %s not sent:\n%s\n%s", email.recipient, email.subject, email.text
        )


def getEmailSender() -> EmailSender:
    configuration = getConfiguration()
    if not configuration.smtpHost:
        return ConsoleEmailSender()
    return SmtpEmailSender(
        host=configuration.smtpHost,
        port=configuration.smtpPort,
        username=configuration.smtpUsername,
        password=configuration.smtpPassword,
        sender=configuration.emailFrom,
        replyTo=configuration.emailReplyTo,
    )


def sendSafely(sender: EmailSender, email: Email) -> None:
    try:
        sender.send(email)
    except Exception:
        logger.exception("Sending an e-mail to %s failed", email.recipient)
