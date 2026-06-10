# Deployment

This project has two deployable parts:

- Frontend: React/Vite app in the repository root.
- Backend: Spring Boot archive API in `backend/`.

## 1. Deploy The Backend

Use a Java/Docker host such as Render, Railway, Fly.io, or another service that can run the `backend/Dockerfile`.

Backend environment variables:

```txt
PORT=8080
STAGE_ARCHIVE_DIRECTORY=stage-archives
STAGE_CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

Notes:

- Many hosts set `PORT` automatically. If they do, leave it alone.
- `STAGE_CORS_ALLOWED_ORIGINS` can contain multiple comma-separated origins.
- For permanent saved stage snapshots, use persistent disk/storage or replace file storage with a database. If the host filesystem is temporary, saved JSON archives can disappear after redeploys.

Local backend command:

```sh
cd backend
./mvnw spring-boot:run
```

## 2. Deploy The Frontend

Use a static frontend host such as Vercel or Netlify.

Frontend build settings:

```txt
Build command: npm run build
Output directory: dist
```

Frontend environment variable:

```txt
VITE_STAGE_API_URL=https://your-backend-domain.com/api/stage
```

Local frontend command:

```sh
npm install
npm run dev
```

For local development, copy `.env.example` to `.env` or rely on the default:

```txt
VITE_STAGE_API_URL=http://localhost:8080/api/stage
```

## 3. Public Launch Checklist

1. Backend is deployed and `/api/stage/list` opens publicly.
2. Frontend has `VITE_STAGE_API_URL` set to the backend `/api/stage` URL.
3. Backend has `STAGE_CORS_ALLOWED_ORIGINS` set to the public frontend URL.
4. Frontend is redeployed after setting the environment variable.
5. Saving and loading a snapshot works from the public site.
