from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

from application.emails.sending import Email

pragueTimeZone = ZoneInfo("Europe/Prague")
signature = "Tým iShelf"


def buildEmail(recipient: str, subject: str, paragraphs: list[str], link: tuple[str, str] | None = None) -> Email:
    textParts = ["Ahoj,", *paragraphs]
    htmlParts = ["<p>Ahoj,</p>", *(f"<p>{escape(paragraph)}</p>" for paragraph in paragraphs)]
    if link:
        label, url = link
        textParts.insert(2, f"{label}: {url}")
        htmlParts.insert(
            2,
            f'<p><a href="{escape(url)}" style="display:inline-block;padding:12px 20px;background:#2e7d4f;'
            f'color:#ffffff;border-radius:8px;text-decoration:none">{escape(label)}</a></p>'
            f'<p style="color:#666;font-size:13px">Pokud tlačítko nefunguje, zkopíruj tento odkaz: {escape(url)}</p>',
        )
    textParts.append(signature)
    htmlParts.append(f"<p>{signature}</p>")
    style = "font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222"
    html = f'<div style="{style}">{"".join(htmlParts)}</div>'
    return Email(recipient=recipient, subject=subject, text="\n\n".join(textParts), html=html)


def passwordResetEmail(recipient: str, resetUrl: str) -> Email:
    return buildEmail(
        recipient,
        "Obnova hesla do iShelf",
        [
            "někdo požádal o obnovu hesla k tvému účtu v aplikaci iShelf.",
            "Odkaz platí 1 hodinu a dá se použít jen jednou.",
            "Pokud o obnově nevíš, tento e-mail ignoruj, heslo zůstane stejné.",
        ],
        ("Nastavit nové heslo", resetUrl),
    )


def passwordChangedEmail(recipient: str, applicationUrl: str) -> Email:
    return buildEmail(
        recipient,
        "Heslo do iShelf bylo změněno",
        [
            "heslo k tvému účtu v aplikaci iShelf bylo právě změněno a ostatní zařízení byla odhlášena.",
            "Pokud o změně nevíš, okamžitě si nastav nové heslo přes „Zapomenuté heslo?“ na přihlašovací stránce.",
        ],
        ("Otevřít iShelf", f"{applicationUrl}/login"),
    )


def accountDeletionEmail(recipient: str, deletionTime: datetime, applicationUrl: str) -> Email:
    localTime = deletionTime.astimezone(pragueTimeZone)
    deletionDate = f"{localTime.day}. {localTime.month}. {localTime.year}"
    return buildEmail(
        recipient,
        "Tvůj účet v iShelf bude smazán",
        [
            f"přišla žádost o smazání tvého účtu. Účet bude nenávratně smazán {deletionDate}.",
            "Do té doby se můžeš přihlásit a smazání zrušit.",
            "Pokud o smazání nevíš, přihlas se, smazání zruš a změň si heslo.",
        ],
        ("Přihlásit se a zrušit smazání", f"{applicationUrl}/login"),
    )
