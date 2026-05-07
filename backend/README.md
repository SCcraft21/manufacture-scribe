# NOVA NEXUS — Backend

AI-powered manufacturing order management API.
Node.js · Express · MongoDB · JWT · Socket.IO · OpenAI (optional)

## Quick start

```bash
cd backend
cp .env.example .env       # fill in MONGO_URI + JWT_SECRET
npm install
npm run dev                # http://localhost:5000
```

## Env vars

| Name | Notes |
|---|---|
| `PORT` | default 5000 |
| `MONGO_URI` | MongoDB connection string (Atlas works) |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRES_IN` | default `7d` |
| `USE_OPENAI` | `true` to enable GPT extraction, else regex only |
| `OPENAI_API_KEY` | required if `USE_OPENAI=true` |
| `OPENAI_MODEL` | default `gpt-4o-mini` |
| `CLIENT_ORIGIN` | CORS origin, default `*` |

## API

All `/api/*` routes (except register/login) require `Authorization: Bearer <token>`.

### Auth
- `POST /api/auth/register` `{ name, email, password, role? }`
- `POST /api/auth/login` `{ email, password }` → `{ user, token }`
- `GET  /api/auth/me`

### Orders
- `GET    /api/orders?status=&material=&search=&page=&limit=&sort=`
- `POST   /api/orders` `{ partName, material, quantity, dimensions, deadline, notes }`
- `GET    /api/orders/:orderNumber`
- `PATCH  /api/orders/:orderNumber/status` `{ status }` (ops/admin)
- `POST   /api/orders/:orderNumber/quality` `{ note }` (ops/admin)
- `GET    /api/orders/:orderNumber/summary`

### Chat (natural language)
- `POST /api/chat` `{ message }`

Examples:
- "I need 200 titanium flanges, 80mm bore, by July 20"
- "Mark order #3 as accepted"
- "Quality update on order #3 — passed visual inspection"

### Dashboard
- `GET /api/dashboard/stats`
- `GET /api/dashboard/quality/latest`
- `GET /api/dashboard/orders/accepted`
- `GET /api/dashboard/orders/material/:material`
- `GET /api/dashboard/activity`

### Admin (admin role)
- `GET /api/admin/analytics`
- `GET /api/admin/users`

### WebSocket events
Connect Socket.IO to the same origin. Events:
- `order:created`, `order:updated`, `order:quality`

## Deployment (Render / Railway)

1. Push to GitHub.
2. Create a Web Service → root: `backend/`
3. Build: `npm install` · Start: `npm start`
4. Add env vars (use MongoDB Atlas for `MONGO_URI`).
5. Set `CLIENT_ORIGIN` to your frontend URL.

## Architecture

```
src/
├── config/        # db connection
├── controllers/   # HTTP handlers
├── middleware/    # auth, validation, errors
├── models/        # Mongoose schemas
├── routes/        # Express routers
├── services/      # business logic + NLP
├── utils/         # logger, ApiError, asyncHandler
├── validators/    # Joi schemas
├── app.js
└── server.js
```
