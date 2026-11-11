# iShelf and Recipes

Shared household food inventory for Czech households. Members share one stock, scan receipts with Gemini, reserve food for cooking and see what is missing for a recipe. A school project (deadline 28 February 2027, 90 % of the work by 31 January 2027) that may later be released on Google Play and the App Store.

The owner communicates in Czech. Reply in Czech in conversation, write everything in the repository in English.

## Stack

- Backend: Python, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL (`backend/`)
- Client: PWA (`frontend/`, not started yet), push notifications through web push
- Receipt reading: Gemini through the `google.genai` library, behind one interface on the server
- Deployment: Docker and docker compose

## Code rules

- Names in English, camelCase for variables, functions, methods and attributes, PascalCase for classes.
- No abbreviations in names (`expirationDate`, not `expDate`).
- Database tables and columns use snake_case; model attributes are camelCase and map to snake_case columns explicitly.
- Keep comments to a minimum, only where really needed.
- JSON keys of the API are camelCase.

## Git

- Commit messages in English, short and non-technical in tone. No co-author trailers or generated-by lines.
- Small commits straight to `main` (solo project).
- Never commit secrets. Keys live only in `.env`, which is git-ignored; `.env.example` documents the variables.

## Gemini API

Never call the Gemini API yourself, because it costs the owner real credit. When code needs a real call to be tested, tell the owner exactly what to run and let him test it by hand. Use mocks in automated tests.

## Commands

- Run everything: `docker compose up --build` (API on http://localhost:8000, docs on `/docs`). Migrations run on backend start.
- Tests: `docker compose run --rm tests` (separate database `<POSTGRES_DB>_test`).
- New migration: `docker compose run --rm -v ./backend/migrations:/backend/migrations backend sh -c "alembic upgrade head && alembic revision --autogenerate -m 'message'"`. Review the generated file; enums must be created and dropped explicitly (see the first migration).

## Design decisions

The full data model is in `docs/databaseDesign.md`. Project documents (design, financial plan, schedule) are in `docs/`.

- Quantities are stored in base units: grams, milliliters, pieces.
- `foods` belong to a household. Predefined recipes are copied into a household when it is created.
- Stock is never deleted; every decrease is a row in `stock_movements`.
- Reservations are made by the person who cooks and may name a recipe. When user A views recipe R, available quantity is the stock minus active reservations of other users, minus A's own reservations for a different recipe.
- One household per user in the MVP (unique `household_members.user_id`); several households will be a premium feature.
- Authentication: access JWT (30 minutes) plus refresh token (60 days, rotated on every refresh, stored hashed, reuse revokes the whole session).
- Receipt photos are never stored, only the extracted items. Users give consent before the first receipt is sent to the model, and can delete their account and data with one button.
- App store rules (to verify before release): in-app account deletion, and an equivalent sign-in option such as Sign in with Apple if Google sign-in is offered.

## Status

Done: repository, docker compose, database models and migration, authentication with refresh tokens, tests.

Next (see the schedule in `docs/`): list of REST endpoints in the README, wireframes, then households with invite codes, storage locations, the PWA skeleton and manual stock items.
