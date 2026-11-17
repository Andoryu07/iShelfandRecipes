import re

from application.models.enumerations import FoodCategory, UnhealthyKind
from application.receipts.quantities import normalizeKey

keywordRules: list[tuple[UnhealthyKind, tuple[str, ...]]] = [
    (UnhealthyKind.tobacco, ("cigaret", "tabak", "marlboro", "camel", "iqos", "heets", "terea", "doutnik")),
    (
        UnhealthyKind.alcohol,
        (
            "pivo", "piva", "lezak", "lezák", "vino", "vína", "prosecco", "sekt", "vodka", "rum", "whisk", "gin ",
            "slivovic", "becherov", "fernet", "jager", "tequila", "likér", "liker", "pilsner", "kozel", "radegast",
            "gambrinus", "budvar", "staropramen", "bernard",
        ),
    ),
    (
        UnhealthyKind.sugaryDrinks,
        ("cola", "kofola", "fanta", "sprite", "limonad", "energy", "red bull", "monster", "ledovy caj", "ice tea", "tonic"),
    ),
    (
        UnhealthyKind.saltySnacks,
        ("chips", "chipsy", "brambur", "slane tycink", "tycinky slane", "krekr", "popcorn", "arasidy solene", "nachos", "bake rolls"),
    ),
    (
        UnhealthyKind.sweets,
        ("cokolad", "bonbon", "susenk", "oplatk", "zmrzlin", "dort", "kolac", "gumov", "lizatk", "nutella", "tycinka", "croissant"),
    ),
]
zeroSugarPattern = re.compile(r"\b(zero|light|bez cukru|0 ?%)\b")


def classifyUnhealthy(name: str, originalText: str, category: FoodCategory | str | None) -> UnhealthyKind | None:
    text = f" {normalizeKey(name)} {normalizeKey(originalText)} "
    for kind, keywords in keywordRules:
        if any(normalizeKey(keyword) in text for keyword in keywords):
            if kind == UnhealthyKind.sugaryDrinks and zeroSugarPattern.search(text):
                return None
            if kind == UnhealthyKind.alcohol and ("nealko" in text or "0,0" in text or "0.0" in text):
                return None
            return kind
    categoryValue = category.value if isinstance(category, FoodCategory) else category
    if categoryValue == FoodCategory.sweets.value:
        return UnhealthyKind.sweets
    return None
