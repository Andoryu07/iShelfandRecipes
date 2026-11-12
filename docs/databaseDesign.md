# Database design

PostgreSQL, names in `snake_case`. Quantities are always stored in base units: grams, milliliters or pieces.

```mermaid
erDiagram
    users ||--o{ household_members : joins
    households ||--o{ household_members : has
    households ||--o{ storage_locations : has
    households ||--o{ foods : has
    households ||--o{ receipts : has
    households ||--o{ recipes : has
    storage_locations ||--o{ stock_items : holds
    foods ||--o{ stock_items : describes
    stock_items ||--o{ stock_movements : logs
    stock_items ||--o{ reservations : reserved_by
    users ||--o{ reservations : makes
    users ||--o{ stock_movements : performs
    users ||--o{ receipts : uploads
    users ||--o{ push_subscriptions : owns
    users ||--o{ refresh_tokens : holds
    receipts ||--o{ receipt_items : contains
    receipt_items |o--o| stock_items : creates
    foods ||--o{ receipt_items : matches
    recipes ||--o{ recipe_ingredients : needs
    foods ||--o{ recipe_ingredients : used_in
    recipes |o--o{ reservations : planned_for
```

## Tables (14)

- **users**: id, email (unique), password_hash, display_name, receipt_consent_given_at (nullable), deletion_requested_at (nullable; the account is deleted 14 days later), created_at
- **households**: id, name, invite_code (unique), expiration_notified_on (date of the last expiration notification), created_at
- **household_members**: id, user_id, household_id, role (owner, member), joined_at. A user belongs to one household for now; several households are a premium feature.
- **storage_locations**: id, household_id, name, kind (fridge, freezer, pantry, custom)
- **foods**: id, household_id, name (unique per household ignoring letter case, as specific as known, for example "Mouka hladká"), generic_name (nullable general kind, for example "Mouka"; recipes will accept any food of the same kind unless they require a specific food), category (fixed list kept in the application), base_unit (gram, milliliter, piece). Each household has its own catalog of foods.
- **stock_items**: id, storage_location_id, food_id, quantity (remaining), expiration_date (nullable), receipt_item_id (nullable), created_at
- **stock_movements**: id, stock_item_id, user_id, quantity_change, reason (eaten, spoiled, destroyed, cooked, correction), created_at
- **reservations**: id, stock_item_id, user_id, recipe_id (nullable), quantity, note, status (active, fulfilled, cancelled), created_at
- **receipts**: id, household_id, user_id, store_name, purchased_on, total_amount, items_sum_matches_total, processing_milliseconds, created_at. The photo is never stored.
- **receipt_items**: id, receipt_id, food_id (nullable until confirmed), original_text, name, category, quantity, unit, price, discount, corrected_by_user
- **recipes**: id, household_id, name, instructions, servings, preparation_minutes, is_predefined, created_at. Predefined recipes are copied into a household when it is created.
- **recipe_ingredients**: id, recipe_id, food_id, quantity, accepts_any_of_kind (any food with the same generic name and unit counts), is_optional (never counted as missing)
- **push_subscriptions**: id, user_id, endpoint (unique), public_key, authentication_secret
- **refresh_tokens**: id, user_id, token_hash (unique), expires_at, revoked_at (nullable), created_at

## Rules

- Stock is never deleted. Every decrease is a row in `stock_movements`, and `stock_items.quantity` holds the remaining amount.
- Reservations are made by the person who cooks and can optionally name a recipe.
- When user A looks at recipe R, the quantity of a food that counts as available to A is:
  - the stock quantity,
  - minus all active reservations of other users,
  - minus A's own active reservations made for a different recipe.

  A's own reservations without a recipe, or made for R, stay available to A.
- Recipe price estimate: the latest price per base unit from `receipt_items` of the same food.
- Authentication uses a short-lived access token (30 minutes, JWT) and a refresh token (60 days). Every refresh replaces the refresh token with a new one, so the session stays alive while the app is used. Refresh tokens are stored only as hashes and can be revoked.
