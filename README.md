# Task AI Edge (Cloudflare Workers + D1 + KV + React)

A minimal full-stack Tasks app:
- **API**: Cloudflare Worker (Hono) + D1 (tasks) + KV (user prefs placeholder)
- **Web**: React + Vite (TypeScript)

---

## Prereqs
- Node.js 20+
- Cloudflare account + Wrangler authenticated

---

## Project Structure
- `api/` Cloudflare Worker API
- `web/` React UI

---

## Local Dev (2 terminals)

### Terminal A — API
API runs at: http://127.0.0.1:8787


```bash
cd api
npx wrangler dev
```


### Terminal B — Web

Web runs at: http://localhost:5173

```bash
cd web
npm install
npm run dev
```

### Environment

Web reads API base from web/.env:

```env
VITE_API_BASE=http://127.0.0.1:8787
```

Note: Restart npm run dev after changing .env

### API Endpoints

- GET /api/health

- GET /api/tasks

- POST /api/tasks (JSON body: title, description)

- PUT /api/tasks/:id (JSON body: status=open|done)

- DELETE /api/tasks/:id

### Database (D1)

Schema is managed via migrations in api/migrations/.

Apply migrations to remote D1:

```bash
cd api
npx wrangler d1 migrations apply task_db --remote
```

## Notes

- D1 binding: task_db

- KV binding: USER_PREFS

- AI binding: AI (reserved for later features)
