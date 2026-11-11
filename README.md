# iShelf and Recipes

Shared household food inventory with receipt scanning and recipes.

## Run locally

```
cp .env.example .env
docker compose up --build
```

Set `JWT_SECRET` in `.env` to a long random value first (for example the output of `openssl rand -hex 32`).

The API is then available at http://localhost:8000, interactive documentation is at http://localhost:8000/docs and `GET /health` returns `{"status": "ok"}`. Database migrations run automatically when the backend starts.

## Run tests

```
docker compose run --rm tests
```

The tests use a separate database named `<POSTGRES_DB>_test`, so development data is never touched.

## REST API

All endpoints except `/health`, `/auth/register`, `/auth/login` and `/auth/refresh` require `Authorization: Bearer <accessToken>`. JSON keys are camelCase. Quantities are in base units (grams, milliliters, pieces).

Collections are nested under a household (`/households/{householdId}/...`), single records are addressed directly by their id (`/stock-items/{stockItemId}`). The server checks on every request that the user is a member of the household the record belongs to. The household id in the path keeps the API ready for users with several households (a planned premium feature), even though a user belongs to one household in the MVP.

Status: **done** endpoints exist, the others are planned.

### Account

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `POST /auth/register` | Create an account, returns access and refresh tokens | done |
| `POST /auth/login` | Log in with email and password | done |
| `POST /auth/refresh` | Exchange a refresh token for a new token pair | done |
| `POST /auth/logout` | Revoke a refresh token | done |
| `GET /auth/me` | Current user | done |
| `PATCH /auth/me` | Change the display name | planned |
| `POST /auth/me/receipt-consent` | Record consent with sending receipts to the model | planned |
| `DELETE /auth/me` | Delete the account and all personal data | planned |

Access tokens are valid for 30 minutes. Refresh tokens are valid for 60 days and are replaced on every refresh.

### Households

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `POST /households` | Create a household; the creator becomes the owner, default storage locations (fridge, freezer, pantry) are created and predefined recipes are copied | done |
| `GET /households` | Households of the current user | done |
| `GET /households/{householdId}` | Household detail | done |
| `PATCH /households/{householdId}` | Rename the household (owner) | done |
| `POST /households/join` | Join a household with an invite code | done |
| `POST /households/{householdId}/invite-code` | Generate a new invite code (owner) | done |
| `GET /households/{householdId}/members` | List members | done |
| `DELETE /households/{householdId}/members/{userId}` | Remove a member (owner) or leave the household (self) | done |

A user who is not a member of the household gets `404`. Invite codes have 8 characters without easily confused ones (`K7PX-M4QR`); case, spaces and hyphens are ignored when joining. Every member sees the code, only the owner can replace it, which invalidates the old one. When a member leaves or is removed, their active reservations are cancelled. When the owner leaves, the longest-standing member becomes the owner; when the last member leaves, the household and all its data are deleted. Default storage locations have English names, the client translates them by their kind.

### Storage locations

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/storage-locations` | List storage locations | done |
| `POST /households/{householdId}/storage-locations` | Add a storage location | done |
| `PATCH /storage-locations/{storageLocationId}` | Rename or change the kind | done |
| `DELETE /storage-locations/{storageLocationId}` | Delete an empty storage location | done |

Every member of the household can manage storage locations. A storage location that still holds food (remaining quantity above zero) cannot be deleted. Used-up stock items of a deleted location are moved to another storage location of the household, so their history is kept; the last storage location with such history cannot be deleted.

### Foods

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/foods?search=` | Search the household food catalog | planned |
| `POST /households/{householdId}/foods` | Add a food | planned |
| `PATCH /foods/{foodId}` | Change name, category or base unit | planned |

### Stock

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/stock-items?storageLocationId=&expiringWithinDays=` | List stock with remaining and reserved quantities | planned |
| `POST /households/{householdId}/stock-items` | Add a stock item manually | planned |
| `PATCH /stock-items/{stockItemId}` | Change expiration date or storage location | planned |
| `GET /stock-items/{stockItemId}/movements` | History of decreases | planned |
| `POST /stock-items/{stockItemId}/movements` | Write off a quantity (eaten, spoiled, destroyed, correction) | planned |

### Reservations

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/reservations?status=` | List reservations of the household | planned |
| `POST /households/{householdId}/reservations` | Reserve a quantity of a stock item, optionally for a recipe | planned |
| `PATCH /reservations/{reservationId}` | Change quantity or note (author) | planned |
| `POST /reservations/{reservationId}/cancel` | Cancel a reservation (author) | planned |

### Receipts

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `POST /households/{householdId}/receipts/scan` | Upload a photo, returns extracted items and whether their sum matches the total; nothing is stored and the photo is discarded | planned |
| `POST /households/{householdId}/receipts` | Save the confirmed items (with the original text and whether the user corrected them) and create stock items | planned |
| `GET /households/{householdId}/receipts` | List receipts | planned |
| `GET /receipts/{receiptId}` | Receipt detail with items | planned |

Scanning requires the receipt consent of the current user.

### Recipes

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/recipes` | List recipes | planned |
| `POST /households/{householdId}/recipes` | Create a recipe | planned |
| `GET /recipes/{recipeId}` | Recipe detail with ingredients | planned |
| `PATCH /recipes/{recipeId}` | Edit a recipe | planned |
| `DELETE /recipes/{recipeId}` | Delete a recipe | planned |
| `GET /recipes/{recipeId}/availability` | Available and missing ingredients for the current user and a price estimate | planned |
| `POST /recipes/{recipeId}/cook` | Deduct the ingredients from stock and fulfil the related reservations | planned |

### Notifications

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /push/public-key` | Public key for web push subscriptions | planned |
| `POST /push-subscriptions` | Register a device for push notifications | planned |
| `DELETE /push-subscriptions` | Unregister a device | planned |

### Statistics

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/statistics/spending?groupBy=month\|store` | Spending totals by month or by store | planned |

### App store release

Google Play and the App Store are a possible later step. The API is designed with their rules in mind:

- Account deletion is available inside the app (`DELETE /auth/me`).
- If sign-in with Google is added (`POST /auth/google`), Sign in with Apple (`POST /auth/apple`) has to be offered as well.
- Push notifications go through web push in the PWA; native wrappers may need a different push channel later.
