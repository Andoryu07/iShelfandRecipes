import enum


class StorageLocationKind(enum.Enum):
    fridge = "fridge"
    freezer = "freezer"
    pantry = "pantry"
    custom = "custom"


class MeasurementUnit(enum.Enum):
    gram = "gram"
    milliliter = "milliliter"
    piece = "piece"


class HouseholdRole(enum.Enum):
    owner = "owner"
    member = "member"


class StockMovementReason(enum.Enum):
    eaten = "eaten"
    spoiled = "spoiled"
    destroyed = "destroyed"
    cooked = "cooked"
    correction = "correction"


class ReservationStatus(enum.Enum):
    active = "active"
    fulfilled = "fulfilled"
    cancelled = "cancelled"


class FoodCategory(enum.Enum):
    dairy = "dairy"
    meatAndSausages = "meatAndSausages"
    fish = "fish"
    fruit = "fruit"
    vegetables = "vegetables"
    bakery = "bakery"
    dryGoods = "dryGoods"
    canned = "canned"
    frozen = "frozen"
    beverages = "beverages"
    spices = "spices"
    sweets = "sweets"
    other = "other"
