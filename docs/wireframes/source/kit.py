from xml.sax.saxutils import escape

INK = "#222"
MUTED = "#777"
LINE = "#999"
FILL = "#e6e6e6"
LIGHT = "#f4f4f4"
WIDTH = 360
HEIGHT = 760


class Screen:
    def __init__(self, title: str, offsetX: int = 20, offsetY: int = 40):
        self.parts: list[str] = []
        self.x = offsetX
        self.y = offsetY
        self.title = title
        self.frame()

    def add(self, markup: str) -> None:
        self.parts.append(markup)

    def rect(self, x, y, w, h, fill="none", stroke=LINE, radius=6, dash=False, strokeWidth=1.2):
        dashAttribute = ' stroke-dasharray="4 3"' if dash else ""
        self.add(
            f'<rect x="{self.x + x}" y="{self.y + y}" width="{w}" height="{h}" rx="{radius}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{strokeWidth}"{dashAttribute}/>'
        )

    def text(self, x, y, value, size=13, color=INK, weight="normal", anchor="start"):
        self.add(
            f'<text x="{self.x + x}" y="{self.y + y}" font-size="{size}" fill="{color}" font-weight="{weight}" '
            f'text-anchor="{anchor}" font-family="Helvetica, Arial, sans-serif">{escape(value)}</text>'
        )

    def circle(self, x, y, r, fill=FILL, stroke=LINE):
        self.add(f'<circle cx="{self.x + x}" cy="{self.y + y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')

    def line(self, x1, y1, x2, y2, color=LINE, dash=False):
        dashAttribute = ' stroke-dasharray="4 3"' if dash else ""
        self.add(
            f'<line x1="{self.x + x1}" y1="{self.y + y1}" x2="{self.x + x2}" y2="{self.y + y2}" stroke="{color}" stroke-width="1.2"{dashAttribute}/>'
        )

    def frame(self):
        self.add(
            f'<text x="{self.x}" y="{self.y - 14}" font-size="15" font-weight="bold" fill="{INK}" font-family="Helvetica, Arial, sans-serif">{escape(self.title)}</text>'
        )
        self.rect(0, 0, WIDTH, HEIGHT, fill="#fff", stroke=INK, radius=22, strokeWidth=2)

    def topBar(self, title, back=False, profile=True):
        if back:
            self.text(16, 40, "←", size=18)
            self.text(40, 40, title, size=18, weight="bold")
        else:
            self.text(16, 40, title, size=20, weight="bold")
        if profile:
            self.circle(WIDTH - 30, 34, 13)
            self.text(WIDTH - 30, 39, "A", size=12, anchor="middle")

    def bottomNavigation(self, active):
        tabs = ["Přehled", "Zásoby", "Recepty", "Účtenky", "Domácnost"]
        self.line(0, HEIGHT - 64, WIDTH, HEIGHT - 64)
        width = WIDTH / len(tabs)
        for index, tab in enumerate(tabs):
            centerX = width * index + width / 2
            isActive = tab == active
            self.rect(centerX - 12, HEIGHT - 54, 24, 20, fill=INK if isActive else FILL, radius=6)
            self.text(centerX, HEIGHT - 18, tab, size=10, color=INK if isActive else MUTED, weight="bold" if isActive else "normal", anchor="middle")

    def chip(self, x, y, label, active=False, width=None):
        width = width or (len(label) * 6.6 + 22)
        self.rect(x, y, width, 26, fill=INK if active else LIGHT, stroke=INK if active else LINE, radius=13)
        self.text(x + width / 2, y + 17, label, size=11, color="#fff" if active else INK, anchor="middle")
        return width

    def button(self, x, y, w, label, primary=True, h=40):
        self.rect(x, y, w, h, fill=INK if primary else "#fff", stroke=INK, radius=10)
        self.text(x + w / 2, y + h / 2 + 5, label, size=13, color="#fff" if primary else INK, weight="bold", anchor="middle")

    def field(self, x, y, w, label, value="", h=40):
        self.rect(x, y, w, h, radius=8)
        if value:
            self.text(x + 10, y - 3, label, size=9, color=MUTED)
            self.text(x + 10, y + h / 2 + 5, value)
        else:
            self.text(x + 10, y + h / 2 + 5, label, color=MUTED)

    def icon(self, x, y, label=""):
        self.circle(x, y, 15)
        if label:
            self.text(x, y + 4, label, size=10, anchor="middle")

    def foodRow(self, y, icon, name, detail, quantity, badge=None, indent=0):
        self.icon(32 + indent, y + 20, icon)
        self.text(56 + indent, y + 17, name, weight="bold")
        self.text(56 + indent, y + 34, detail, size=11, color=MUTED)
        self.text(WIDTH - 16, y + 25, quantity, anchor="end", weight="bold")
        if badge:
            self.chip(WIDTH - 16 - 60 - len(badge) * 6.6, y + 8, badge, width=len(badge) * 6.6 + 18)
        self.line(16 + indent, y + 46, WIDTH - 16, y + 46, color="#ddd")

    def note(self, x, y, value):
        self.text(x, y, value, size=10, color="#a33")

    def sheetBackdrop(self, top):
        self.rect(0, 0, WIDTH, HEIGHT, fill="#000", stroke="none", radius=22)
        self.parts[-1] = self.parts[-1].replace('fill="#000"', 'fill="#000" fill-opacity="0.18"')
        self.rect(0, top, WIDTH, HEIGHT - top, fill="#fff", stroke=INK, radius=18, strokeWidth=1.5)
        self.rect(WIDTH / 2 - 20, top + 8, 40, 5, fill=LINE, stroke="none", radius=3)


def document(screens: list[Screen], width: int, height: int = 820) -> str:
    body = "\n".join(part for screen in screens for part in screen.parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">\n'
        f'<rect width="{width}" height="{height}" fill="#fafafa"/>\n{body}\n</svg>\n'
    )
