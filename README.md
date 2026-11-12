# iShelf and Recipes

Shared household food inventory with receipt scanning and recipes.

## Run locally

```
cp .env.example .env
docker compose up --build
```

Set `JWT_SECRET` in `.env` to a long random value first (for example the output of `openssl rand -hex 32`).

The app is then available at http://localhost:5173 (the development server reloads on every change and forwards `/api` to the backend). The backend shares its code with the containers and restarts on every change too, so a rebuild is needed only when dependencies change (`requirements*.txt`, `package.json`). The API is available at http://localhost:8000, interactive documentation is at http://localhost:8000/docs and `GET /health` returns `{"status": "ok"}`. Database migrations run automatically when the backend starts.

## Run tests

```
docker compose run --rm tests
```

Frontend checks (from `frontend/`, after `npm install`):

```
npm test
npm run lint
npm run build
```

The tests use a separate database named `<POSTGRES_DB>_test`, so development data is never touched.

## Frontend

A progressive web app in `frontend/`: React, TypeScript, Vite, Material UI, TanStack Query and React Router. The user interface is in Czech; all texts live in `frontend/source/translations/cs.ts`. The service worker (`frontend/source/serviceWorker.ts`) precaches the app and will handle push notifications later. The same build can later be wrapped with Capacitor for Google Play and the App Store.

The receipts screen takes a photo with the phone camera, shrinks it to at most 1600 px on the longer side before upload, asks for consent before the first scan and lets the user review and correct every item before saving.

Installing the app on a phone needs HTTPS; plain HTTP works only on `localhost`.

## REST API

All endpoints except `/health`, `/auth/register`, `/auth/login` and `/auth/refresh` require `Authorization: Bearer <accessToken>`. JSON keys are camelCase. Quantities are in base units (grams, milliliters, pieces).

Collections are nested under a household (`/households/{householdId}/...`), single records are addressed directly by their id (`/stock-items/{stockItemId}`). The server checks on every request that the user is a member of the household the record belongs to. The household id in the path keeps the API ready for users with several households (a planned premium feature), even though a user belongs to one household in the MVP.

Status: **done** endpoints exist, the others are planned.

### Account

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `POST /auth/register` | Create an account, returns an access token and sets the refresh token cookie | done |
| `POST /auth/login` | Log in with email and password | done |
| `POST /auth/refresh` | Exchange the refresh token cookie for a new access token and a new cookie | done |
| `POST /auth/logout` | Revoke the refresh token and clear the cookie | done |
| `GET /auth/me` | Current user | done |
| `PATCH /auth/me` | Change the display name | planned |
| `POST /auth/me/receipt-consent` | Record consent with sending receipts to the model | done |
| `DELETE /auth/me` | Delete the account and all personal data | planned |

Access tokens are valid for 30 minutes and the client keeps them only in memory. Refresh tokens are valid for 60 days, are replaced on every refresh and travel only in the `refreshToken` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`), so scripts in the page cannot read them. Browsers accept `Secure` cookies over plain HTTP only on `localhost`; set `REFRESH_TOKEN_COOKIE_SECURE=false` in `.env` only if you must test over plain HTTP from another device.

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
| `GET /households/{householdId}/foods?search=` | Search the household food catalog | done |
| `POST /households/{householdId}/foods` | Add a food | done |
| `PATCH /foods/{foodId}` | Change name, category or base unit | done |

Every food has a specific name (`Mléko polotučné`) and optionally a general kind (`genericName`, for example `Mléko`), which recipes will use to accept a suitable substitute. Food names are unique within a household regardless of letter case, and search ignores case and accents (`mleko` finds `Mléko`). Categories are a fixed list: `dairy`, `meatAndSausages`, `fish`, `fruit`, `vegetables`, `bakery`, `dryGoods`, `canned`, `frozen`, `beverages`, `spices`, `sweets`, `other`. The base unit cannot change once the food is in stock or in a recipe.

### Stock

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/stock-items?storageLocationId=&expiringWithinDays=` | List stock with remaining and reserved quantities | done |
| `POST /households/{householdId}/stock-items` | Add a stock item manually | done |
| `PATCH /stock-items/{stockItemId}` | Change expiration date or storage location | done |
| `GET /stock-items/{stockItemId}/movements` | History of decreases | done |
| `POST /stock-items/{stockItemId}/movements` | Write off a quantity (eaten, spoiled, destroyed, correction) | done |

The list contains only items with something left, sorted by expiration date (items without a date last). Every purchase is its own stock item, the same food is never merged. Write-offs send `{"reason": "eaten" | "spoiled" | "destroyed", "quantity": 250}` and cannot exceed what remains; a correction sends `{"reason": "correction", "newQuantity": 3}` and may also increase the quantity. Stock added by mistake is corrected to zero, never deleted. Expiration filters use the Europe/Prague date.

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
| `POST /households/{householdId}/receipts/scan` | Upload a photo, returns extracted items and whether their sum matches the total; nothing is stored and the photo is discarded | done |
| `POST /households/{householdId}/receipts` | Save the confirmed items (with the original text and whether the user corrected them) and create stock items | done |
| `GET /households/{householdId}/receipts` | List receipts | done |
| `GET /receipts/{receiptId}` | Receipt detail with items | done |

Saving sends the reviewed items; each item either names an existing food (`foodId`), a new one (`newFood`, reused when a food with the same name already exists) or none, and with `addToStock` also `quantity` in the food's base unit, `storageLocationId` and optionally `expirationDate`. The whole receipt is saved in one transaction, so an invalid item saves nothing.

Scanning requires the receipt consent of the current user. The photo is sent as multipart field `image` (JPEG, PNG, WebP or HEIC, at most 10 MB) and is kept only in memory. The model returns the number of identical packages on a line and the server splits them into separate items with a share of the price, so every package can get its own expiration date (at most 20 per line). The server checks the sum of the items against the total with a tolerance of 1 CZK and suggests matching foods from the household catalog.

Receipts are read by Gemini, configured in `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_THINKING_LEVEL`). Automated tests never call it. To try a real receipt by hand:

```
docker compose run --rm -v ./receipt.jpg:/receipt.jpg backend python -m application.receipts.try_receipt /receipt.jpg
```

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
