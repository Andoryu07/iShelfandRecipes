import argparse
import logging
import urllib.request
from collections.abc import Iterable

from sqlalchemy import and_, delete, func, insert, or_, select, update
from sqlalchemy.orm import Session

from application.catalog.openFoodFacts import ImportedProduct, openDump, productKey, readProducts
from application.database import getSessionFactory
from application.models import CatalogProduct, Food
from application.models.nutrition import nutritionFieldNames

dumpUrl = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
userAgent = "iShelf/1.0 (household food inventory; Open Food Facts import)"
batchSize = 2000
logger = logging.getLogger(__name__)


def importProducts(session: Session, products: Iterable[ImportedProduct]) -> int:
    session.execute(delete(CatalogProduct))
    batch: list[dict] = []
    count = 0
    for product in products:
        batch.append(
            {
                "barcode": product.barcode,
                "name": product.name,
                "nameKey": productKey(product),
                "brand": product.brand,
                "quantityText": product.quantityText,
                "quantity": product.quantity,
                "unit": product.unit,
                "category": product.category.value,
                "popularity": product.popularity,
                "nutriscoreGrade": product.nutriscoreGrade,
                **{name: product.nutrition.get(name) for name in nutritionFieldNames},
            }
        )
        if len(batch) >= batchSize:
            session.execute(insert(CatalogProduct), batch)
            count += len(batch)
            batch = []
            logger.info("Imported %d products", count)
    if batch:
        session.execute(insert(CatalogProduct), batch)
        count += len(batch)
    filled = fillMissingFoodNutrition(session)
    session.commit()
    logger.info("Filled nutrition of %d household foods by their barcode", filled)
    return count


def fillMissingFoodNutrition(session: Session) -> int:
    def catalogValue(columnName: str):
        return (
            select(getattr(CatalogProduct, columnName))
            .where(CatalogProduct.barcode == Food.barcode)
            .scalar_subquery()
        )

    withoutNutrition = and_(*(getattr(Food, name).is_(None) for name in nutritionFieldNames))
    catalogHasNutrition = (
        select(CatalogProduct.barcode)
        .where(
            CatalogProduct.barcode == Food.barcode,
            or_(*(getattr(CatalogProduct, name).is_not(None) for name in nutritionFieldNames)),
        )
        .exists()
    )
    result = session.execute(
        update(Food)
        .where(Food.barcode.is_not(None), withoutNutrition, catalogHasNutrition)
        .values(
            {
                **{name: catalogValue(name) for name in nutritionFieldNames},
                "nutriscoreGrade": func.coalesce(Food.nutriscoreGrade, catalogValue("nutriscoreGrade")),
            }
        )
        .execution_options(synchronize_session=False)
    )
    return result.rowcount


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    parser = argparse.ArgumentParser(description="Import Czech products from the Open Food Facts CSV dump.")
    parser.add_argument("--file", help="A downloaded .csv.gz dump instead of downloading it")
    arguments = parser.parse_args()
    if arguments.file:
        stream = open(arguments.file, "rb")
    else:
        stream = urllib.request.urlopen(urllib.request.Request(dumpUrl, headers={"User-Agent": userAgent}))
    with stream, getSessionFactory()() as session:
        count = importProducts(session, readProducts(openDump(stream)))
    logger.info("Done: %d Czech products in the catalog", count)


if __name__ == "__main__":
    main()
