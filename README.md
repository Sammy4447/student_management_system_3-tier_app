# Student Management System

A full-stack student management system — **React (Vite)** frontend, **Node.js/Express** backend, **MongoDB** database.

## Features

| # | Feature | Where |
|---|---------|-------|
| 1 | **Student Registration** — name, email, phone, address, date of birth, gender, course, semester, roll number | `/students/new` |
| 2 | **Student List** — table of all students, search by name/email/roll number, filter by course/semester, pagination | `/students` |
| 3 | **Student Details** — complete profile view | `/students/:id` |
| 4 | **Edit Student** — update existing information | `/students/:id/edit` |
| 5 | **Delete Student** — remove with a confirmation dialog | list & profile |
| 6 | **Dashboard** — students / courses / semesters counters, recent students, distribution by course | `/` |

## Project Structure

```
student_mngmt_system/
├── backend/
│   ├── .env                      # PORT, MONGO_URI, CLIENT_ORIGIN
│   └── src/
│       ├── server.js             # Express app + startup
│       ├── seed.js               # Sample data generator
│       ├── config/db.js          # Mongoose connection
│       ├── models/Student.js     # Schema, validation, indexes
│       ├── controllers/          # Request handlers
│       ├── routes/               # /api/students
│       └── middleware/           # Central error handling
└── frontend/
    └── src/
        ├── App.jsx               # Routes
        ├── hooks.js              # useMeta, useDebounced
        ├── api/                  # axios client + endpoints
        ├── components/           # Layout, StudentForm, Toast, Avatar, …
        ├── pages/                # Dashboard, List, Details, Add, Edit
        └── styles/index.css      # Design system
```

## Setup

### 1. MongoDB

Either run MongoDB locally (default `mongodb://127.0.0.1:27017`), or use MongoDB Atlas and
put the connection string in `backend/.env`:

```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/student_mngmt_system
```

### 2. Backend

```bash
cd backend
npm install
npm run seed     # optional: 40 sample students
npm run dev      # http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:5000`, so no CORS setup is needed in development.

For the full explanation of each part — every environment variable, the API
reference, PM2, the production build — see
**[BACKEND_SETUP.md](BACKEND_SETUP.md)** and
**[FRONTEND_SETUP.md](FRONTEND_SETUP.md)**.

## Documentation

| File | What it covers |
|---|---|
| [SETUP.md](SETUP.md) | Deploying everything to one EC2 instance (Amazon Linux 2023) — the server, nginx, verification, troubleshooting |
| [BACKEND_SETUP.md](BACKEND_SETUP.md) | The Express API and MongoDB — install, `.env`, seeding, PM2, API reference |
| [FRONTEND_SETUP.md](FRONTEND_SETUP.md) | The React app — install, `.env`, dev server, production build, deploying the build |

Both setup files work for local development and for the server, so
[SETUP.md](SETUP.md) links out to them rather than repeating the steps.

## Deployment

To host the whole stack — MongoDB, the Express API and the React build — on a
single EC2 instance behind nginx, start with **[SETUP.md](SETUP.md)**. It
covers launching the instance, installing git, Node, MongoDB and nginx, cloning
the project, the nginx configuration, and deploying updates — handing off to
the two setup files above for the application itself.

It deploys over plain HTTP with no login system, which is fine for a teaching
demo and not fine for real student data — the guide says so explicitly at the
end.

## API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service check |
| GET | `/students` | List students. Query: `search`, `course`, `semester`, `page`, `limit`, `sort` |
| GET | `/students/stats` | Dashboard counters, recent students, distributions |
| GET | `/students/meta` | Course / gender / semester options |
| GET | `/students/:id` | One student (includes computed `age`) |
| POST | `/students` | Create a student |
| PUT | `/students/:id` | Update a student |
| DELETE | `/students/:id` | Delete a student |

### Response shape

```jsonc
// success
{ "success": true, "data": { ... }, "pagination": { "page": 1, "limit": 10, "total": 40, "totalPages": 4 } }

// failure
{ "success": false, "message": "Validation failed", "errors": { "email": "Please provide a valid email" } }
```

Status codes: `400` validation / bad id, `404` not found, `409` duplicate email or roll number, `500` server error.

## Data Model

| Field | Type | Rules |
|-------|------|-------|
| `name` | String | required, 2–80 chars |
| `email` | String | required, unique, valid format, lowercased |
| `phone` | String | required, 7–20 chars |
| `address` | String | required, max 200 chars |
| `dateOfBirth` | Date | required, must be in the past |
| `gender` | Enum | Male / Female / Other |
| `course` | Enum | BCA / BIT / BBA / BSc CSIT / BBM |
| `semester` | Number | 1–8 |
| `rollNumber` | String | required, unique, uppercased |

`age` is a virtual derived from `dateOfBirth`. Indexes cover text search and the course+semester filter.

To change the course list or semester count, edit `COURSES` / `MAX_SEMESTER` in
[backend/src/models/Student.js](backend/src/models/Student.js) — the frontend dropdowns read
them from `/api/students/meta`, so both sides stay in sync automatically.
