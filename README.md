# iShelf and Recipes

Shared household food inventory with receipt scanning and recipes.

## Run locally

```
cp .env.example .env
docker compose up --build
```

Set `JWT_SECRET` in `.env` to a long random value first (for example the output of `openssl rand -hex 32`).

The app is then available at http://localhost:5173 (the development server reloads on every change and forwards `/api` to the backend). The backend shares its code with the containers and restarts on every change too, so a rebuild is needed only when dependencies change (`requirements*.txt`, `package.json`). The API is available at http://localhost:8000, interactive documentation is at http://localhost:8000/docs and `GET /health` returns `{"status": "ok"}`. Database migrations run automatically when the backend starts.

## Deployment

The app runs at https://ishelf.cz.

Production runs with `docker-compose.production.yml` (Caddy with automatic HTTPS, backend, worker, PostgreSQL and nightly database backups). The step-by-step guide for a WEDOS virtual server and a `.cz` domain is in [docs/deployment.md](docs/deployment.md).

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

A progressive web app in `frontend/`: React, TypeScript, Vite, Material UI, TanStack Query and React Router. The user interface is in Czech; all texts live in `frontend/source/translations/cs.ts`. The service worker (`frontend/source/serviceWorker.ts`) precaches the app, shows push notifications and receives receipts shared from other apps: the manifest declares a share target (`POST /share-receipt`, an image or PDF in the `receipt` field), the service worker keeps the file in Cache Storage and opens `/receipts?shared=1`, which asks whether to scan it and deletes it afterwards. Sharing works in the installed app on Android and in Chrome or Edge on Windows and ChromeOS, not on iOS. The same build can later be wrapped with Capacitor for Google Play and the App Store.

Navigation has five tabs (Přehled, Zásoby, Recepty, Účtenky, Domácnost), at the bottom on phones and at the side from 900 px; the profile opens from the top right avatar and has its own pages (account, appearance with light, dark or system theme stored on the device, notifications, privacy and data, about). The wireframes of the redesign are described in `docs/wireframes.md`.

The receipts screen takes a photo with the phone camera, shrinks it to at most 1600 px on the longer side before upload, asks for consent before the first scan and lets the user review and correct every item before saving.

The privacy policy is a public page at `/privacy` (text in `frontend/source/translations/cs.ts`), linked from registration, the receipt consent and the household screen, where the user can also withdraw the consent and delete the account.

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
| `POST /auth/password-reset/request` | Send a password reset link if the e-mail belongs to an account (always 202, at most 3 e-mails per account per hour) | done |
| `POST /auth/password-reset/confirm` | Set a new password with the link's token (valid 1 hour, once) and sign out everywhere | done |
| `POST /auth/me/password` | Change the password with the current one; other devices are signed out, this one gets new tokens | done |
| `GET /auth/me` | Current user | done |
| `PATCH /auth/me` | Change the display name | planned |
| `POST /auth/me/receipt-consent` | Record consent with sending receipts to the model | done |
| `DELETE /auth/me/receipt-consent` | Withdraw the consent; saved items stay | done |
| `DELETE /auth/me` | Schedule the account for deletion after confirming the password (`{"password": "..."}`) | done |
| `POST /auth/me/restore` | Cancel a scheduled deletion | done |
| `POST /auth/guest` | Start without an account (`{"householdName": "..."}`): creates a guest user with its own household and signs in; at most 5 guests per IP address a day (`429`), only a hash of the address is stored | done |
| `POST /auth/me/upgrade` | Turn a guest into a full account with name, e-mail and password; all data stays (`409` for a taken e-mail or a non-guest) | done |
| `GET /auth/me/plan` | The user's plan (`guest`, `free` or `premium`, per user), premium end, used and allowed scans (bonus scans from rewarded ads included), household count and limit, member and storage location limits, months of spending history, sharing and food photos allowed, whether ads show and how many rewarded ads are left today | done |
| `POST /auth/me/premium/test-activation` | Turn on 30 days of premium without paying (only with `PREMIUM_TEST_ACTIVATION=true`, otherwise 404) | done |
| `DELETE /auth/me/premium/test-activation` | Turn the test premium off | done |
| `POST /auth/me/rewarded-ads` | Record a watched rewarded ad (`{"kind": "receiptScan" | "recipeScan"}`): +1 scan in the current period, at most 3 a day, not for guests or premium, off with `ADS_ENABLED=false` (`429`); the placeholder is not verified by an ad network yet | done |

Deleting an account signs the user out everywhere and schedules the deletion; signing in within 14 days offers to restore the account (other endpoints answer `403` until then), and the daily job then deletes it. Deletion removes the user, their reservations and sessions; stock, movements and receipts stay with the household without the link to the user, and a household whose last member leaves is deleted.

Access tokens are valid for 30 minutes and the client keeps them only in memory. Refresh tokens are valid for 60 days, are replaced on every refresh and travel only in the `refreshToken` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`), so scripts in the page cannot read them. Browsers accept `Secure` cookies over plain HTTP only on `localhost`; set `REFRESH_TOKEN_COOKIE_SECURE=false` in `.env` only if you must test over plain HTTP from another device.

Password reset links point to `APPLICATION_URL/reset-password#token=…`; the token is after `#`, so it never reaches the server logs, and only its hash is stored. E-mails (reset link, password changed, account deletion notice) are sent in the background through SMTP behind `EmailSender`; without `SMTP_HOST` they are only written to the log.

### Households

A user can belong to several households: free accounts and guests 1, premium 3 (own and joined together; `409` "The household limit is reached", `409` "User already belongs to this household"). Members and storage locations are limited by the best plan among the owners (members 6/12, storage locations 3/9; `409` when full). A household is locked 24 hours after its owner's premium ends (the household response shows `locksAt` during that grace period) when it has more members than the owners' plan allows, or when it is one of the owner's extra households (a free owner keeps only the oldest own household unlocked; households the user only joined are never locked because of the user's plan). A locked household refuses changes: every change in it answers `403` "The household is locked" (checked centrally in `findMembership` for POST, PUT, PATCH and DELETE requests), except removing members, notification settings, rejecting join requests and revoking invite links; reading and the export keep working. Guests cannot share their household or join others (`403`).

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `POST /households` | Create a household; the creator becomes the owner, default storage locations (fridge, freezer, pantry) are created and predefined recipes are copied | done |
| `GET /households` | Households of the current user | done |
| `GET /households/{householdId}` | Household detail | done |
| `PATCH /households/{householdId}` | Rename the household (owner) | done |
| `POST /households/join` | Ask to join with the invite code (202); the owner gets a push notification and must approve; a new request replaces the user's previous one | done |
| `GET /join-requests/mine` | The user's own pending or rejected request, or `null` | done |
| `DELETE /join-requests/mine` | Cancel or dismiss the own request | done |
| `GET /households/{householdId}/join-requests` | Pending requests with the applicant's name and masked e-mail (owner only) | done |
| `POST /join-requests/{requestId}/approve` | Approve a request: the applicant becomes a member (owner only); `409` when the household is full (6 members, 12 when an owner has premium) | done |
| `POST /join-requests/{requestId}/reject` | Reject a request; the applicant sees it was rejected (owner only) | done |
| `POST /households/{householdId}/invite-links` | Create a one-time invite link valid 7 days; the token is returned only now and stored hashed (owner only) | done |
| `GET /households/{householdId}/invite-links` | Unused, valid links (owner only) | done |
| `DELETE /invite-links/{linkId}` | Revoke a link (owner only) | done |
| `POST /households/join-by-link` | Join right away with a link's token (`410` when used, revoked or expired) | done |
| `GET /households/{householdId}/exports/receipt-items` | All receipt items of the household with date and store, for the CSV export in the app (also works in a locked household) | done |
| `POST /households/{householdId}/invite-code` | Generate a new invite code (owner) | done |
| `GET /households/{householdId}/members` | List members | done |
| `DELETE /households/{householdId}/members/{userId}` | Remove a member (owner) or leave the household (self) | done |

A user who is not a member of the household gets `404`. Invite codes have 8 characters without easily confused ones (`K7PX-M4QR`); case, spaces and hyphens are ignored when joining. Every member sees the code, only the owner can replace it, which invalidates the old one. When a member leaves or is removed, their active reservations are cancelled. When the owner leaves, the longest-standing member becomes the owner; when the last member leaves, the household and all its data are deleted. Default storage locations have English names, the client translates them by their kind.

### Storage locations

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/storage-locations` | List storage locations | done |
| `POST /households/{householdId}/storage-locations` | Add a storage location | done |
| `PATCH /storage-locations/{storageLocationId}` | Rename, change the kind or the icon | done |
| `DELETE /storage-locations/{storageLocationId}` | Delete an empty storage location | done |
| `GET /storage-locations/{storageLocationId}/history?limit=` | What happened in the location, newest first: items added there, write-offs, corrections, cooking and moves in or out | done |

Every member of the household can manage storage locations. A storage location that still holds food (remaining quantity above zero) cannot be deleted. Used-up stock items of a deleted location are moved to another storage location of the household, so their history is kept; the last storage location with such history cannot be deleted.

### Foods

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/foods?search=` | Search the household food catalog | done |
| `POST /households/{householdId}/foods` | Add a food | done |
| `PATCH /foods/{foodId}` | Change name, kind, category, icon or base unit | done |
| `GET /foods/{foodId}/last-added-quantity` | Original quantity of the newest stock item of the food (from stock or receipts), used to prefill the add form; `null` if never added | done |
| `PUT /foods/{foodId}/photo` | Upload the food's own photo (multipart field `file`, WebP, JPEG or PNG, at most 100 kB; the client shrinks it to 256 × 256); the food response then carries `photoUrl` | done |
| `DELETE /foods/{foodId}/photo` | Remove the food's photo (the emoji icon is shown again) | done |
| `GET /foods/{foodId}/photo?version=&signature=` | Serve the photo without a token (for `<img>`); the link is signed with the server secret and changes with every new photo, cached as immutable | done |

Every food has a specific name (`Mléko polotučné`) and optionally a general kind (`genericName`, for example `Mléko`), which recipes will use to accept a suitable substitute. Food names always start with a capital letter (`mléko` is saved as `Mléko`) and are unique within a household regardless of letter case, and search ignores case and accents (`mleko` finds `Mléko`). Categories are a fixed list: `dairy`, `meatAndSausages`, `fish`, `fruit`, `vegetables`, `bakery`, `dryGoods`, `canned`, `frozen`, `beverages`, `spices`, `sweets`, `other`. The base unit cannot change once the food is in stock or in a recipe.

Storage locations, foods and recipes have an optional `icon` (one emoji, up to 16 characters, no plain text). Sending `"icon": null` clears it and the client falls back to an icon by kind or category.

### Stock

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/stock-items?storageLocationId=&expiringWithinDays=` | List stock with remaining and reserved quantities | done |
| `POST /households/{householdId}/stock-items` | Add a stock item manually | done |
| `PATCH /stock-items/{stockItemId}` | Change expiration date or storage location (a move is recorded in the history) | done |
| `GET /stock-items/{stockItemId}/movements` | History of decreases, corrections and moves | done |
| `POST /stock-items/{stockItemId}/movements` | Write off a quantity (eaten, spoiled, destroyed, correction) | done |

The list contains only items with something left, sorted by expiration date (items without a date last). Every purchase is its own stock item, the same food is never merged. Write-offs send `{"reason": "eaten" | "spoiled" | "destroyed", "quantity": 250}` and cannot exceed what remains; a correction sends `{"reason": "correction", "newQuantity": 3}` and may also increase the quantity. Stock added by mistake is corrected to zero, never deleted. Expiration filters use the Europe/Prague date.

### Reservations

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/reservations?status=` | List reservations of the household | done |
| `POST /households/{householdId}/reservations` | Reserve a quantity of a stock item, optionally for a recipe | done |
| `PATCH /reservations/{reservationId}` | Change quantity or note (author) | done |
| `POST /reservations/{reservationId}/cancel` | Cancel a reservation (author) | done |

Reservations are made only from the free quantity (stock minus all active reservations). Other members can eat only the free quantity; when the author eats, free food is used first and then their own reservation, which becomes fulfilled when used up. Spoiled or destroyed food and corrections down may cut into reservations, the newest first. Only the author changes or cancels a reservation. Every stock item in the stock list carries its active reservations.

### Receipts

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `POST /households/{householdId}/receipts/scan` | Upload a photo, returns extracted items and whether their sum matches the total; nothing is stored and the photo is discarded; `429` when the user's monthly limit is used up (free 10, premium 60; only successful scans count). Before reading, a file with the same SHA-256 hash as an already saved receipt of the household answers `409` `{"code": "sameFile", "receipt": {...}}` without calling the model (`?ignoreSameFile=true` reads it anyway). The response has `receiptNumber`, `fileHash` (send both back when saving) and `quantitySource` per item (`receipt` printed and read by the model, `text` parsed from the item text like "1L" or "0,15KG", `history` the household's earlier receipt with the same text, `catalog` the shared catalog of confirmed quantities from all households, `estimate` the model's estimate of the usual package, `typical` a typical package of the food kind; the last two are estimates the app marks strongly), and `possibleDuplicate` (a saved receipt with the same receipt number, compared by its digits, at the same store or date, otherwise with the same store, date and total) | done |
| `POST /households/{householdId}/receipts` | Save the confirmed items (with the original text and whether the user corrected them) and create stock items | done |
| `GET /households/{householdId}/receipts` | List receipts | done |
| `GET /receipts/{receiptId}` | Receipt detail with items | done |

Saving sends the reviewed items; each item either names an existing food (`foodId`), a new one (`newFood`, reused when a food with the same name already exists) or none, and with `addToStock` also `quantity` in the food's base unit, `storageLocationId` and optionally `expirationDate`. The whole receipt is saved in one transaction, so an invalid item saves nothing.

Scanning requires the receipt consent of the current user. The photo or PDF is sent as multipart field `file` (JPEG, PNG, WebP, HEIC or PDF, at most 10 MB) and is kept only in memory. The model returns the number of identical packages on a line and the server splits them into separate items with a share of the price, so every package can get its own expiration date (at most 20 per line). The server checks the sum of the items against the total with a tolerance of 1 CZK and suggests matching foods from the household catalog. The household's earlier receipts are remembered: when an item's original text was saved before (from the same store first), the scan takes the name and food the household used then, so corrected abbreviations stay corrected (`rememberedFromEarlierReceipt`). The model is told not to guess unknown abbreviations.

Receipts are read by Gemini, configured in `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_THINKING_LEVEL`). Automated tests never call it. To try a real receipt by hand:

```
docker compose run --rm -v ./receipt.jpg:/receipt.jpg backend python -m application.receipts.try_receipt /receipt.jpg
```

### Recipes

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/recipes?search=&containsFoodIds=` | List recipes (the user's favourites first) with missing count, price estimate, dish type, vegetarian flag and `expiringIngredientCount` (ingredients the user could cover with food expiring within their warning days); `containsFoodIds` (up to 5) keeps recipes that contain every chosen food or a food of the same kind | done |
| `POST /households/{householdId}/recipes` | Create a recipe | done |
| `GET /households/{householdId}/recipes/scan-allowance` | How many recipe scans the user has used, the limit and its period (free: 3 in total, premium: 20 a month) | done |
| `POST /households/{householdId}/recipes/scan` | Read a recipe from 1-3 photos or PDFs (multipart field `files`) with Gemini and return a draft for the editor: name, servings, time, dish type, vegetarian flag, numbered steps and ingredients in base units matched to the household's foods by name; needs the photo consent; a successful scan counts towards the household limit (`429` when used up); photos are never stored | done |
| `GET /recipes/{recipeId}` | Recipe detail with ingredients | done |
| `PATCH /recipes/{recipeId}` | Edit a recipe | done |
| `DELETE /recipes/{recipeId}` | Delete a recipe | done |
| `GET /recipes/{recipeId}/availability?servings=` | Available and missing ingredients for the current user and a price estimate from the latest receipt price of each food (or of the same kind) | done |
| `POST /recipes/{recipeId}/reserve` | Reserve everything that is available for the recipe, earliest expiration first | done |
| `PUT /recipes/{recipeId}/favourite` | Mark the recipe as the user's favourite (personal; favourites come first in the recipe list, `isFavourite` in list and detail) | done |
| `DELETE /recipes/{recipeId}/favourite` | Remove the recipe from the user's favourites | done |
| `GET /households/{householdId}/cookings?limit=` | Everything cooked in the household, newest first (default 100); cookings of deleted recipes stay with their name | done |
| `GET /recipes/{recipeId}/cookings` | Who cooked the recipe, when and for how many servings (newest 50) | done |
| `POST /recipes/{recipeId}/cook` | Deduct the ingredients from stock (own reservations for the recipe first, then free stock with the earliest expiration) and fulfil the related reservations | done |

A new household gets five predefined recipes written for this project (`backend/application/recipes/predefined.json`) together with the foods they need. Every ingredient points to a food; `acceptsAnyOfKind` lets any food of the same general kind and unit count (any milk), otherwise only that food counts (plain flour). Optional ingredients (salt, spices) never count as missing. For user A and recipe R, the available quantity is the stock minus active reservations of other users, minus A's own reservations for a different recipe.


### Shopping list

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/shopping-list` | Items the user can see: the shared household list and the user's personal list, unchecked first | done |
| `POST /households/{householdId}/shopping-list` | Add a food (`foodId`, optional `quantity`) or free text (`name`), optional `note`, `isPersonal`; an unchecked item of the same food on the same list gets the quantity added | done |
| `POST /recipes/{recipeId}/shopping-list` | Add the missing required ingredients of a recipe for the given servings (pieces rounded up) | done |
| `PATCH /shopping-list-items/{itemId}` | Change quantity or note, check or uncheck, move between the shared and the personal list | done |
| `DELETE /shopping-list-items/{itemId}` | Remove an item | done |
| `DELETE /households/{householdId}/shopping-list/checked` | Remove all checked items the user can see | done |

Personal items are visible only to their owner and are deleted when the owner leaves the household or deletes the account. Bought food items are added to stock in the app with the normal stock endpoint and then removed from the list.

### Notifications

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /push/public-key` | Public key for web push subscriptions | done |
| `POST /push-subscriptions` | Register a device for push notifications | done |
| `DELETE /push-subscriptions` | Unregister a device | done |
| `PATCH /households/{householdId}/notification-settings` | Change the own notification hour (6-22) and days ahead (0-7); returns the household with the own settings | done |
| `POST /push-subscriptions/test` | Send a test notification to one of the user's own subscriptions (by `endpoint`); `404` if it is unknown or the browser cancelled it | done |

The `worker` service runs the scheduled jobs right after start and then at every full hour (Prague time): accounts past their 14-day deletion period are deleted, and every member whose notification hour has come and who has not been notified today gets one summary push notification on their devices about food in the household that expires within their chosen number of days. Each member picks the hour (6:00-22:00, default 8:00) and the days ahead (0-7, default 2) in the profile (`PATCH /households/{householdId}/notification-settings`); the same days decide what the app shows as expiring soon. Subscriptions the browser has cancelled are removed. The server sends only data; the service worker writes the Czech text.

Push notifications need VAPID keys in `.env`:

```
docker compose run --rm backend python -m application.notifications.generate_vapid_keys
```

To send today's notifications right away (ignoring the once-a-day rule):

```
docker compose run --rm backend python -m application.jobs.run_daily_jobs --force
```

### Food catalog

A shared copy of the Czech products of Open Food Facts (ODbL), imported with `python -m application.catalog.import_open_food_facts` (see `docs/deployment.md`).

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /catalog/products?search=mleko madeta&limit=8` | Products whose name and brand contain every word (accents and case ignored), most scanned first; used by the food picker when adding food | done |
| `GET /catalog/products/{barcode}` | One product by its barcode (for scanning barcodes later) | done |

### Statistics

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /households/{householdId}/statistics/spending?month=2026-11&months=6` | Totals for the selected month and the months before it, by store and by food category; free users see only the last 6 months (older month `403`, the chart is cut) | done |

Totals are what was paid (`total_amount` of saved receipts, so whole-purchase discounts are included); category totals add up the positive item prices and discounts are reported separately. Stock added by hand has no price and is not counted.

### App store release

Google Play and the App Store are a possible later step. The API is designed with their rules in mind:

- Account deletion is available inside the app (`DELETE /auth/me`).
- If sign-in with Google is added (`POST /auth/google`), Sign in with Apple (`POST /auth/apple`) has to be offered as well.
- Push notifications go through web push in the PWA; native wrappers may need a different push channel later.
