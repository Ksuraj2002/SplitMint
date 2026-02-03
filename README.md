# SplitMint — Your Gateway to Karbon

Full-stack MERN expense-splitting app (MongoDB, Express, React, Node.js).

## Features

- **Auth**: Register & login with email
- **Groups**: Create, edit, delete groups (max 4 participants per group)
- **Participants**: Add, edit, remove participants with linked expense handling
- **Expenses**: Add/edit/delete with split modes: equal, custom amount, percentage
- **Balance engine**: Who owes whom, net balance per participant, minimal settlement suggestions
- **Visualizations**: Summary cards (total spent, owed to you, you owe), balance table, transaction history
- **Search & filters**: Search by description, filter by participant, date range

## Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

## Setup

1. **Clone / open project**
   ```bash
   cd splitmint
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```
   Or manually:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

3. **Backend env**
   ```bash
   cd server
   cp .env.example .env
   ```
   Edit `server/.env`:
   - `PORT=5000`
   - `MONGODB_URI=mongodb://localhost:27017/splitmint` (or your Atlas URI)
   - `JWT_SECRET=your-secret-key`
   - (Optional) `CORS_ORIGIN` — for production, set to your frontend URL (e.g. `https://splitmint.vercel.app`)

4. **Run**
   - **Both (recommended):** from project root:
     ```bash
     npm run dev
     ```
   - **Or separately:**
     - Terminal 1: `cd server && npm run dev` (or `node server.js`)
     - Terminal 2: `cd client && npm run dev`

5. **Open**
   - Frontend: http://localhost:5173
   - API: http://localhost:5000

## Project structure

```
splitmint/
├── client/          # React (Vite) frontend
│   ├── src/
│   │   ├── api/     # axios instance
│   │   ├── components/
│   │   ├── context/ # AuthContext
│   │   └── pages/
│   └── package.json
├── server/          # Express backend
│   ├── app.js       # Express app (used by server.js and Vercel api)
│   ├── middleware/  # auth
│   ├── models/      # User, Group, Participant, Expense
│   ├── routes/      # auth, groups, expenses, balance
│   ├── server.js    # local dev entry (listens on PORT)
│   └── package.json
├── api/             # Vercel serverless: forwards /api/* to Express
│   └── index.js
├── vercel.json      # Vercel build & rewrites
├── package.json     # root scripts
└── README.md
```

## Deploy on Vercel

1. **Push the repo to GitHub** (if not already).

2. **Import on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new), import your GitHub repo.
   - **Framework Preset:** leave as *Other* or *Vite* (build is overridden by `vercel.json`).
   - **Root Directory:** `.` (project root).
   - **Build and Output:** `vercel.json` sets these; no need to change unless you prefer.

3. **Environment variables** (Project → Settings → Environment Variables)
   - `MONGODB_URI` — your MongoDB connection string (e.g. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)).
   - `JWT_SECRET` — a long random secret for JWT.
   - `CORS_ORIGIN` — your Vercel app URL, e.g. `https://your-project.vercel.app` (so the API allows requests from the frontend).

4. **Deploy**
   - Deploy; Vercel will run `npm run install:all`, build the client, and deploy the API from `api/index.js`.
   - Frontend and `/api/*` are on the same domain; the client’s `baseURL: '/api'` works without changes.

## API overview

- `POST /api/auth/register` — register
- `POST /api/auth/login` — login
- `GET /api/groups` — list groups (auth)
- `POST /api/groups` — create group (auth)
- `GET/PUT/DELETE /api/groups/:id` — group CRUD (auth)
- `POST /api/groups/:id/participants` — add participant (auth)
- `PUT/DELETE /api/groups/:groupId/participants/:participantId` — edit/remove participant (auth)
- `GET/POST /api/expenses` — list (query: groupId, search, participantId, fromDate, toDate) / create (auth)
- `PUT/DELETE /api/expenses/:id` — update/delete expense (auth)
- `GET /api/balance/group/:groupId` — balances & settlements for group (auth)
- `GET /api/balance/summary` — global summary (auth)
