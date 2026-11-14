import sys
from pathlib import Path

from kit import FILL, HEIGHT, INK, LIGHT, LINE, MUTED, WIDTH, Screen, document

outputDirectory = Path(sys.argv[1])
outputDirectory.mkdir(parents=True, exist_ok=True)


def save(name: str, screens: list[Screen], width: int = 400) -> None:
    (outputDirectory / name).write_text(document(screens, width), encoding="utf-8")


def overview() -> Screen:
    s = Screen("01 Přehled (úvodní obrazovka)")
    s.topBar("Ahoj, Anno")
    s.button(16, 64, 160, "📷 Vyfotit účtenku")
    s.button(184, 64, 160, "+ Přidat potravinu", primary=False)
    s.rect(16, 120, WIDTH - 32, 196, fill="#fff")
    s.text(28, 144, "Brzy projde (3)", size=15, weight="bold")
    s.text(WIDTH - 28, 144, "Vše →", size=12, color=MUTED, anchor="end")
    for index, (icon, name, badge, qty) in enumerate([("🥛", "Mléko", "dnes", "1 l"), ("🍶", "Jogurt", "zítra", "4 ks"), ("🥓", "Šunka", "za 2 dny", "120 g")]):
        s.foodRow(152 + index * 52, icon, name, "Lednice", qty, badge=badge)
    s.rect(16, 328, WIDTH - 32, 100, fill="#fff")
    s.text(28, 352, "Moje rezervace", size=15, weight="bold")
    s.foodRow(362, "🧀", "Eidam · 600 g", "na Smažený sýr", "")
    s.text(28, 452, "Můžeš uvařit hned", size=15, weight="bold")
    for index, (name, meta) in enumerate([("Smažený sýr", "30 min · 120 Kč"), ("Rajská omáčka", "2 h · 180 Kč")]):
        x = 16 + index * 172
        s.rect(x, 464, 160, 120, fill="#fff")
        s.rect(x + 10, 474, 140, 50, fill=LIGHT, radius=6)
        s.text(x + 80, 504, "ikona jídla", size=10, color=MUTED, anchor="middle")
        s.text(x + 10, 546, name, weight="bold")
        s.text(x + 10, 566, meta, size=11, color=MUTED)
    s.rect(16, 600, WIDTH - 32, 80, fill=LIGHT, dash=True)
    s.text(WIDTH / 2, 636, "Útraty tento měsíc (krok 2)", color=MUTED, anchor="middle")
    s.text(WIDTH / 2, 656, "místo připravené pro přehled útrat", size=10, color=MUTED, anchor="middle")
    s.bottomNavigation("Přehled")
    return s


def stock() -> Screen:
    s = Screen("02 Zásoby")
    s.topBar("Zásoby")
    s.field(16, 60, WIDTH - 32, "🔍 Hledat v zásobách")
    x = 16
    for label, active in [("Vše", True), ("Lednice", False), ("Mrazák", False), ("Spíž", False)]:
        x += s.chip(x, 110, label, active) + 8
    s.text(16, 162, "BRZY PROJDE", size=11, color=MUTED, weight="bold")
    s.foodRow(170, "🥛", "Mléko  ×3", "nejbližší dnes · Lednice", "3 l", badge="dnes")
    s.rect(16, 220, WIDTH - 32, 120, fill=LIGHT, stroke="none", radius=8)
    for index, date in enumerate(["dnes (14. 11.)", "do 18. 11.", "do 21. 11."]):
        y = 222 + index * 38
        s.text(48, y + 22, "1 l", weight="bold")
        s.text(90, y + 22, date, size=11, color="#555")
        s.line(40, y + 36, WIDTH - 24, y + 36, color="#ddd")
    s.foodRow(346, "🍶", "Jogurt", "Lednice · rezervováno 2 ks", "4 ks", badge="zítra")
    s.text(16, 418, "OSTATNÍ", size=11, color=MUTED, weight="bold")
    s.foodRow(426, "🧀", "Eidam", "Lednice · do 30. 11.", "600 g")
    s.foodRow(474, "🍝", "Těstoviny", "Spíž · bez data", "1 kg")
    s.foodRow(522, "🫛", "Hrášek", "Mrazák · do 11. 3.", "450 g")
    s.circle(WIDTH - 44, HEIGHT - 104, 26, fill=INK, stroke=INK)
    s.text(WIDTH - 44, HEIGHT - 96, "+", size=24, color="#fff", anchor="middle")
    s.note(16, 590, "stejné potraviny v jednom řádku, klepnutí rozbalí jednotlivé kusy")
    s.note(16, 606, "štítky: prošlé (červená), dnes / do 3 dnů (oranžová); kus → panel 03")
    s.bottomNavigation("Zásoby")
    return s


def stockItemSheet() -> Screen:
    s = Screen("03 Detail položky (spodní panel)")
    s.topBar("Zásoby")
    s.foodRow(60, "🥛", "Mléko", "Lednice", "1 l")
    s.sheetBackdrop(250)
    s.icon(36, 292, "🥛")
    s.text(60, 290, "Mléko polotučné", size=17, weight="bold")
    s.text(60, 308, "Mléčné výrobky", size=11, color=MUTED)
    s.text(16, 350, "1 l", size=28, weight="bold")
    x = 80
    for label in ["Lednice", "do 14. 11."]:
        x += s.chip(x, 332, label) + 6
    s.rect(16, 372, WIDTH - 32, 40, fill=LIGHT, radius=8)
    s.text(28, 397, "Anna 600 ml (na palačinky) · volné 400 ml", size=12)
    s.text(WIDTH - 28, 397, "Zrušit", size=12, anchor="end", weight="bold")
    s.button(16, 428, WIDTH - 32, "Snězeno vše")
    s.button(16, 476, (WIDTH - 40) / 2, "Odepsat část", primary=False)
    s.button(24 + (WIDTH - 40) / 2, 476, (WIDTH - 40) / 2, "Vyhodit (zkažené)", primary=False)
    s.button(16, 524, (WIDTH - 40) / 2, "Rezervovat", primary=False)
    s.button(24 + (WIDTH - 40) / 2, 524, (WIDTH - 40) / 2, "Upravit", primary=False)
    s.text(16, 594, "▸ Historie (2)", weight="bold")
    s.note(16, 620, "historie sbalená, rozbalí se klepnutím")
    return s


def addFoodSheet() -> Screen:
    s = Screen("04 Přidat potravinu (spodní panel)")
    s.topBar("Zásoby")
    s.sheetBackdrop(150)
    s.text(16, 196, "Přidat do zásob", size=17, weight="bold")
    s.field(16, 212, WIDTH - 32, "Potravina", "Mléko polotučné")
    s.text(16, 274, "Naposledy:", size=11, color=MUTED)
    x = 80
    for label in ["Mléko", "Chléb", "Vejce", "Máslo"]:
        x += s.chip(x, 260, label) + 6
    s.field(16, 304, 210, "Množství", "1")
    s.field(234, 304, 110, "Jednotka", "l ▾")
    s.text(16, 372, "Místo", size=11, color=MUTED)
    x = 16
    for label, active in [("Lednice", True), ("Mrazák", False), ("Spíž", False)]:
        x += s.chip(x, 380, label, active) + 6
    s.text(16, 432, "Spotřebovat do", size=11, color=MUTED)
    x = 16
    for label, active in [("Bez data", False), ("+3 dny", False), ("+1 týden", True), ("+1 měsíc", False)]:
        x += s.chip(x, 440, label, active) + 6
    s.chip(16, 474, "Vybrat datum…")
    s.text(130, 492, "= 21. 11. 2026", size=12, color=MUTED)
    s.button(16, 520, WIDTH - 32, "Přidat")
    s.note(16, 590, "nová potravina: jednotka, druh a kategorie pod polem Potravina")
    return s


def receipts() -> list[Screen]:
    left = Screen("05a Účtenky")
    left.topBar("Účtenky")
    left.rect(16, 64, WIDTH - 32, 150, fill=LIGHT, dash=True)
    left.text(WIDTH / 2, 124, "📷", size=30, anchor="middle")
    left.text(WIDTH / 2, 156, "Vyfotit účtenku", size=15, weight="bold", anchor="middle")
    left.text(WIDTH / 2, 178, "nebo nahrát fotku či PDF", size=11, color=MUTED, anchor="middle")
    left.text(16, 248, "ULOŽENÉ ÚČTENKY", size=11, color=MUTED, weight="bold")
    for index, (store, meta, total) in enumerate([("Albert", "13. 11. · 7 položek · Anna", "204,30 Kč"), ("Billa", "10. 11. · 2 položky · Petr", "44,70 Kč"), ("Lidl", "8. 11. · 15 položek · Anna", "612,10 Kč")]):
        y = 258 + index * 52
        left.icon(32, y + 20, "🧾")
        left.text(56, y + 17, store, weight="bold")
        left.text(56, y + 34, meta, size=11, color=MUTED)
        left.text(WIDTH - 16, y + 25, total, anchor="end", weight="bold")
        left.line(16, y + 46, WIDTH - 16, y + 46, color="#ddd")
    left.bottomNavigation("Účtenky")

    right = Screen("05b Kontrola účtenky", offsetX=420)
    right.topBar("Kontrola účtenky", back=True, profile=False)
    right.text(16, 78, "Albert · 13. 11. 2026 · 204,30 Kč", weight="bold")
    right.text(WIDTH - 16, 78, "upravit", size=11, color=MUTED, anchor="end")
    right.text(16, 104, "Uložit do:", size=11, color=MUTED)
    x = 76
    for label, active in [("Lednice", True), ("Mrazák", False), ("Spíž", False)]:
        x += right.chip(x, 90, label, active) + 6
    rows = [("☑", "Sýr Gran Moravia", "250 g", "99,90"), ("☑", "Anglický rohlík", "100 g", "17,50"), ("☑", "Chléb Šumava", "1,2 kg", "22,40")]
    for index, (check, name, qty, price) in enumerate(rows):
        y = 128 + index * 44
        right.text(20, y + 26, check, size=16)
        right.text(46, y + 20, name, weight="bold")
        right.text(46, y + 36, qty + " · nová potravina", size=10, color=MUTED)
        right.text(WIDTH - 16, y + 26, price, anchor="end")
        right.line(16, y + 44, WIDTH - 16, y + 44, color="#ddd")
    right.rect(16, 266, WIDTH - 32, 170, fill=LIGHT, radius=8)
    right.text(28, 288, "☑  Balkánský sýr   (rozbaleno)", weight="bold")
    right.field(28, 300, 200, "Potravina", "Sýr balkánský")
    right.field(236, 300, 96, "Cena", "29,90")
    right.field(28, 352, 150, "Množství", "180 g")
    right.field(186, 352, 146, "Spotřebovat do", "+1 týden")
    right.text(28, 418, "Druh: Sýr · Mléčné výrobky   upravit", size=11, color=MUTED)
    right.text(20, 470, "☐", size=16)
    right.text(46, 464, "Sleva", weight="bold")
    right.text(46, 480, "nepotravina", size=10, color=MUTED)
    right.text(WIDTH - 16, 470, "−20,00", anchor="end")
    right.text(16, 520, "+ Přidat položku", weight="bold")
    right.rect(8, HEIGHT - 94, WIDTH - 16, 86, fill="#fff", stroke=LINE, radius=14)
    right.text(16, HEIGHT - 62, "✓ Součet sedí (204,30 Kč)", size=12, weight="bold")
    right.button(16, HEIGHT - 48, WIDTH - 32, "Uložit účtenku (6 do zásob)")
    right.note(16, 560, "lišta dole zůstává vidět i při posouvání")
    return [left, right]


def recipes() -> Screen:
    s = Screen("06 Recepty")
    s.topBar("Recepty")
    s.field(16, 60, WIDTH - 32, "🔍 Hledat recept")
    x = 16
    for label, active in [("Můžu uvařit hned", False), ("Do 30 min", False), ("Moje", False)]:
        x += s.chip(x, 110, label, active) + 6
    cards = [("Smažený sýr", "30 min · ~120 Kč", "Máš vše"), ("Hovězí guláš", "2 h 30 min · ~260 Kč", "Chybí 2"), ("Rajská omáčka", "2 h · ~180 Kč", "Chybí 1")]
    for index, (name, meta, badge) in enumerate(cards):
        y = 150 + index * 112
        s.rect(16, y, WIDTH - 32, 100, fill="#fff")
        s.rect(26, y + 10, 80, 80, fill=LIGHT, radius=8)
        s.text(66, y + 55, "ikona", size=10, color=MUTED, anchor="middle")
        s.text(118, y + 32, name, size=15, weight="bold")
        s.text(118, y + 52, meta, size=11, color=MUTED)
        s.chip(118, y + 62, badge, active=badge == "Máš vše")
    s.circle(WIDTH - 44, HEIGHT - 104, 26, fill=INK, stroke=INK)
    s.text(WIDTH - 44, HEIGHT - 96, "+", size=24, color="#fff", anchor="middle")
    s.bottomNavigation("Recepty")
    return s


def recipeDetail() -> Screen:
    s = Screen("07 Detail receptu")
    s.topBar("Hovězí guláš", back=True, profile=False)
    s.text(16, 70, "2 h 30 min · ~260 Kč (65 Kč/porce)", size=12, color=MUTED)
    s.rect(16, 84, WIDTH - 32, 112, fill=LIGHT, stroke=INK, strokeWidth=2.5)
    s.text(28, 110, "⚠ Chybí ti 2 suroviny", size=15, weight="bold")
    s.text(28, 136, "Hovězí kližka: chybí 300 g z 800 g", weight="bold")
    s.text(28, 160, "Cibule: chybí 500 g", weight="bold")
    s.text(28, 182, "+ Přidat do nákupního seznamu (později)", size=11, color=MUTED)
    s.text(16, 226, "Porce", weight="bold")
    s.rect(70, 208, 110, 28, radius=14)
    s.text(84, 227, "−", size=16)
    s.text(125, 227, "4", weight="bold", anchor="middle")
    s.text(166, 227, "+", size=16, anchor="end")
    s.text(16, 266, "SUROVINY", size=11, color=MUTED, weight="bold")
    items = [("✗", "Hovězí kližka", "800 g"), ("✗", "Cibule", "500 g"), ("✓", "Paprika sladká mletá", "20 g"), ("✓", "Rajčatový protlak", "70 g"), ("✓", "Houskový knedlík", "2 ks")]
    for index, (mark, name, qty) in enumerate(items):
        y = 276 + index * 34
        s.text(20, y + 20, mark, weight="bold")
        s.text(44, y + 20, name)
        s.text(WIDTH - 16, y + 20, qty, anchor="end", color=MUTED)
    s.text(16, 470, "Podle chuti: Kmín, Majoránka, Pepř, Sůl", size=11, color=MUTED)
    s.text(16, 504, "POSTUP", size=11, color=MUTED, weight="bold")
    for index in range(4):
        s.rect(16, 516 + index * 22, WIDTH - 32 - index * 30, 10, fill=FILL, stroke="none", radius=4)
    s.rect(8, HEIGHT - 80, WIDTH - 16, 72, fill="#fff", stroke=LINE, radius=14)
    s.button(16, HEIGHT - 60, (WIDTH - 40) / 2, "Rezervovat", primary=False)
    s.button(24 + (WIDTH - 40) / 2, HEIGHT - 60, (WIDTH - 40) / 2, "Uvařeno")
    s.note(16, 630, "upravit / smazat recept v menu ⋮ vpravo nahoře")
    return s


def householdAndProfile() -> list[Screen]:
    left = Screen("08a Domácnost")
    left.topBar("Líškovi")
    left.rect(16, 64, WIDTH - 32, 120, fill=LIGHT)
    left.text(28, 90, "Pozvat člena", size=15, weight="bold")
    left.text(28, 126, "RM92-EHFH", size=22, weight="bold")
    left.button(28, 138, 130, "Sdílet kód", h=34)
    left.text(170, 160, "Nový kód", size=12, weight="bold")
    left.text(16, 214, "ČLENOVÉ", size=11, color=MUTED, weight="bold")
    for index, (name, role) in enumerate([("Anna (ty)", "vlastník"), ("Petr", "člen")]):
        left.foodRow(222 + index * 48, name[0], name, role, "")
    left.text(16, 340, "MÍSTA ULOŽENÍ", size=11, color=MUTED, weight="bold")
    for index, name in enumerate(["Lednice", "Mrazák", "Spíž"]):
        left.foodRow(348 + index * 48, "", name, "", "✎")
    left.text(16, 516, "+ Nové místo", weight="bold")
    left.text(16, 560, "Opustit domácnost", color="#a33", weight="bold")
    left.bottomNavigation("Domácnost")

    right = Screen("08b Profil (ikona vpravo nahoře)", offsetX=420)
    right.topBar("Profil", back=True, profile=False)
    right.circle(WIDTH / 2, 110, 34)
    right.text(WIDTH / 2, 118, "A", size=24, anchor="middle")
    right.text(WIDTH / 2, 166, "Anna", size=16, weight="bold", anchor="middle")
    right.text(WIDTH / 2, 184, "anna@example.com", size=11, color=MUTED, anchor="middle")
    right.text(16, 226, "VZHLED", size=11, color=MUTED, weight="bold")
    x = 16
    for label, active in [("Světlý", False), ("Tmavý", False), ("Podle systému", True)]:
        x += right.chip(x, 236, label, active) + 6
    right.text(16, 296, "UPOZORNĚNÍ", size=11, color=MUTED, weight="bold")
    right.text(16, 324, "Blížící se trvanlivost (8:00)")
    right.rect(WIDTH - 60, 310, 44, 22, fill=INK, radius=11)
    right.circle(WIDTH - 27, 321, 8, fill="#fff", stroke="#fff")
    right.text(16, 370, "SOUKROMÍ", size=11, color=MUTED, weight="bold")
    for index, label in enumerate(["Zásady ochrany soukromí", "Odvolat souhlas se skenováním"]):
        right.text(16, 398 + index * 34, label)
        right.text(WIDTH - 16, 398 + index * 34, "›", anchor="end")
    right.button(16, 480, WIDTH - 32, "Odhlásit se", primary=False)
    right.text(16, 550, "Smazat účet", color="#a33", weight="bold")
    return [left, right]


def flow() -> Screen:
    s = Screen("09 Tok mezi obrazovkami", offsetX=20)
    s.parts = s.parts[:1]
    boxes = {
        "login": (20, 30, "Přihlášení / registrace"),
        "setup": (200, 30, "Založit / připojit domácnost"),
        "overview": (110, 130, "01 Přehled"),
        "stock": (10, 240, "02 Zásoby"),
        "recipes": (130, 240, "06 Recepty"),
        "receipts": (250, 240, "05a Účtenky"),
        "item": (10, 350, "03 Detail položky"),
        "add": (10, 440, "04 Přidat potravinu"),
        "detail": (130, 350, "07 Detail receptu"),
        "review": (250, 350, "05b Kontrola"),
        "household": (10, 560, "08a Domácnost"),
        "profile": (200, 560, "08b Profil"),
    }
    for key, (x, y, label) in boxes.items():
        s.rect(x, y, 110 if key not in ("login", "setup") else 160, 44, fill="#fff", stroke=INK)
        s.text(x + (55 if key not in ("login", "setup") else 80), y + 27, label, size=11, anchor="middle")
    arrows = [((180, 52), (200, 52)), ((280, 74), (190, 130)), ((165, 174), (65, 240)), ((165, 174), (185, 240)), ((165, 174), (305, 240)), ((90, 284), (90, 350)), ((30, 284), (30, 440)), ((185, 284), (185, 350)), ((305, 284), (305, 350)), ((305, 394), (120, 270)), ((120, 582), (200, 582))]
    for (x1, y1), (x2, y2) in arrows:
        s.line(x1, y1, x2, y2, color=INK)
        s.circle(x2, y2, 3, fill=INK, stroke=INK)
    s.text(20, 650, "Spodní lišta: Přehled · Zásoby · Recepty · Účtenky · Domácnost", size=11, color=MUTED)
    s.text(20, 668, "Profil je dostupný z ikony vpravo nahoře na každé hlavní obrazovce.", size=11, color=MUTED)
    s.text(20, 686, "Přehled vede na detail položky, recept a skenování účtenky.", size=11, color=MUTED)
    s.text(20, 704, "Uložená účtenka vede zpět do Zásob; + v Zásobách otevře 04.", size=11, color=MUTED)
    return s


save("01-overview.svg", [overview()])
save("02-stock.svg", [stock()])
save("03-stock-item.svg", [stockItemSheet()])
save("04-add-food.svg", [addFoodSheet()])
save("05-receipts.svg", receipts(), width=800)
save("06-recipes.svg", [recipes()])
save("07-recipe-detail.svg", [recipeDetail()])
save("08-household-and-profile.svg", householdAndProfile(), width=800)
save("09-flow.svg", [flow()], width=420)
print("ok")
