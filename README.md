# Visual Scene Planner

Visual Scene Planner is a React + Three.js stage planning app with custom stage geometry, props, choreography tools, platform drawing, and snapshot save/load support through a Spring Boot backend.

## Local Development

Install frontend dependencies:

```sh
npm install
```

Run the frontend:

```sh
npm run dev
```

Run the backend in a second terminal:

```sh
cd backend
./mvnw spring-boot:run
```

The frontend defaults to:

```txt
http://localhost:8080/api/stage
```

You can override that by creating `.env`:

```txt
VITE_STAGE_API_URL=http://localhost:8080/api/stage
```

## Checks

```sh
npm run lint
npm run build
cd backend && ./mvnw test
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for public hosting setup.
