# iShelf and Recipes

Shared household food inventory with receipt scanning and recipes.

## Run locally

```
cp .env.example .env
docker compose up --build
```

The API is then available at http://localhost:8000 and `GET /health` returns `{"status": "ok"}`.
