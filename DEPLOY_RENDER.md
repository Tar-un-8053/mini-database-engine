# Deploy on Render

This project is now set up so the backend can serve the built frontend from one Node service.

## Folder to deploy

Use the backend folder as the Render service root:

`Mini-database engine backend`

## Build and start commands

- Build command: `npm run build`
- Start command: `npm start`

## Environment variables

- `PORT`
  Render sets this automatically.
- `DB_PATH`
  Recommended value when using a persistent disk: `/var/data/mini_database.db`

## Step by step

1. Push this project to GitHub.
2. Open Render and create a new `Web Service`.
3. Connect your GitHub repository.
4. Set `Root Directory` to `Mini-database engine backend`.
5. Set `Build Command` to `npm run build`.
6. Set `Start Command` to `npm start`.
7. Add environment variable `DB_PATH=/var/data/mini_database.db`.
8. Add a persistent disk in Render and mount it at `/var/data`.
9. Deploy the service.
10. Open `https://your-service.onrender.com/health` to confirm the server is up.
11. Open the main Render URL to use the app.

## Notes

- The frontend uses `/api` by default, so it works automatically when the backend serves it.
- If you deploy frontend and backend separately later, set `VITE_API_BASE_URL` in the frontend build environment.

