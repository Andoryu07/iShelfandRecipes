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

## Authentication

| Endpoint | Purpose |
| --- | --- |
| `POST /auth/register` | Create an account, returns access and refresh tokens |
| `POST /auth/login` | Log in with email and password |
| `POST /auth/refresh` | Exchange a refresh token for a new token pair |
| `POST /auth/logout` | Revoke a refresh token |
| `GET /auth/me` | Current user (requires `Authorization: Bearer <accessToken>`) |

Access tokens are valid for 30 minutes. Refresh tokens are valid for 60 days and are replaced on every refresh.
