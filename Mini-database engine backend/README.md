
# Mini-database engine backend

Backend server for the Mini Database Engine educational platform.

## Tech Stack
- **Node.js** + **Express** — REST API server
- **better-sqlite3** — SQLite database engine
- **CORS** enabled for frontend integration

## Setup

```bash
npm install
npm start
```

Server starts on **http://localhost:3001**

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tables` | GET | List all tables with schema & data |
| `/api/query` | POST | Execute any SQL query |
| `/api/query/plan` | POST | Get query execution plan (EXPLAIN) |
| `/api/indexes?table=x` | GET | Get B-Tree and Hash index info |
| `/api/transactions` | GET | Get transaction history |
| `/api/transactions/begin` | POST | Begin a new transaction |
| `/api/transactions/commit` | POST | Commit active transaction |
| `/api/transactions/rollback` | POST | Rollback active transaction |
| `/api/storage` | GET | Get storage statistics |

## Database

SQLite database is automatically created as `mini_database.db` on first run with seed data:
- **students** table (5 rows)
- **courses** table (3 rows)
- Indexes on `age` and `major` columns
