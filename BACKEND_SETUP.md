# Backend setup

Everything needed to get the Express API and MongoDB running — on your laptop
for development, or on an EC2 instance for deployment.

If you are deploying to EC2, [SETUP.md](SETUP.md) sends you here at step 6.
Finish this file, then go back to it for the frontend and nginx.

---

## Contents

1. [What the backend is](#1-what-the-backend-is)
2. [Prerequisites](#2-prerequisites)
3. [Install the dependencies](#3-install-the-dependencies)
4. [Create the environment file](#4-create-the-environment-file)
5. [Load sample data](#5-load-sample-data)
6. [Run it](#6-run-it)
7. [Keep it running with PM2](#7-keep-it-running-with-pm2)
8. [API reference](#8-api-reference)
9. [Backend troubleshooting](#9-backend-troubleshooting)

---

## 1. What the backend is

A REST API built with **Express**, storing data in **MongoDB** through
**Mongoose**. It has no user interface of its own — it answers JSON requests
and nothing else. The React frontend is a separate program that calls it.

```
backend/
├── .env                      ← you create this; never committed
└── src/
    ├── server.js             Express app, middleware, starts the server
    ├── seed.js               Fills the database with 40 sample students
    ├── config/db.js          The MongoDB connection
    ├── models/Student.js     Schema, validation rules, indexes
    ├── controllers/          What each endpoint actually does
    ├── routes/               Maps URLs to controllers
    └── middleware/           404 handling and the central error handler
```

One file is worth knowing about early: **`models/Student.js`** defines the list
of courses, the gender options and the semester range. Those are served to the
frontend through `/api/students/meta`, so the dropdowns in the UI always match
what the database will accept. Add a course there and it appears in the form —
no frontend change needed.

---

## 2. Prerequisites

- **Node.js 20+** — check with `node -v`
- **MongoDB**, either running locally or a MongoDB Atlas connection string

On EC2, [SETUP.md](SETUP.md) step 4 installs both. Locally, install Node from
[nodejs.org](https://nodejs.org) and either install MongoDB Community Server or
create a free Atlas cluster.

Confirm MongoDB is reachable before going further:

```bash
# Local install (Linux)
sudo systemctl status mongod       # expect "active (running)"
```

---

## 3. Install the dependencies

```bash
cd backend      # on EC2: cd ~/student_mngmt_system/backend
npm install
```

This installs five packages:

| Package | What it does |
|---|---|
| `express` | The web framework — routing, middleware, request handling |
| `mongoose` | Talks to MongoDB, and enforces the schema and validation rules |
| `cors` | Lets the browser call the API from a different origin during development |
| `dotenv` | Loads `.env` into `process.env` |
| `morgan` | Logs every HTTP request to the console, which makes debugging far easier |

---

## 4. Create the environment file

`.env` is listed in `.gitignore`, so it is never committed and will not exist
in a fresh clone. Environment files hold settings specific to each machine, and
one day they will hold passwords — that is exactly why they stay out of git.

Create it inside `backend/`:

```bash
nano .env      # or: cp .env.example .env && nano .env
```

**For local development:**

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/student_mngmt_system
CLIENT_ORIGIN=http://localhost:5173
```

**On EC2**, substitute your instance's public IP:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/student_mngmt_system
CLIENT_ORIGIN=http://<EC2_PUBLIC_IP>
```

In nano, save with `Ctrl+O`, `Enter`, then exit with `Ctrl+X`.

What each line does:

- **`PORT`** — the port Express listens on. In deployment nginx forwards to
  this port, so the two must agree ([SETUP.md](SETUP.md) step 8).
- **`MONGO_URI`** — where the database is. `127.0.0.1` means "this same
  machine". You do not need to create the database first; MongoDB creates
  `student_mngmt_system` on the first write. For Atlas, paste the connection
  string from their dashboard instead.
- **`CLIENT_ORIGIN`** — which origin is allowed to call the API (CORS). In
  development that is the Vite dev server on port 5173. In deployment requests
  arrive through nginx from the same origin, so it rarely matters — but setting
  it correctly keeps the configuration honest.

---

## 5. Load sample data

```bash
npm run seed
```

This inserts 40 sample students so the dashboard and list pages have something
to show, then prints `Seeded 40 students.`

> **It deletes all existing students first.** Run it on a fresh database only —
> never after you have entered records you want to keep.

---

## 6. Run it

**During development**, use the watch mode — it restarts the server whenever
you save a file:

```bash
npm run dev
```

**In production** (and on EC2), run it plainly:

```bash
npm start
```

Either way you should see:

```
MongoDB connected: 127.0.0.1/student_mngmt_system
Server listening on http://localhost:5000
```

### Verify it before moving on

```bash
curl http://localhost:5000/api/health
curl "http://localhost:5000/api/students?limit=2"
```

The health check returns
`{"success":true,"message":"Student Management API is running"}`.

Get this working before you touch the frontend. If the API is broken, every
later step will look broken too.

---

## 7. Keep it running with PM2

**Skip this section for local development** — `npm run dev` is all you need
there. This is for the server.

### Why PM2 is needed

`npm start` runs the API in your terminal, attached to your SSH session. That
creates three problems on a real server:

1. **It dies when you log out.** Close the terminal and the site goes down.
2. **It does not come back after a crash.** An unhandled error ends the
   process, and nothing restarts it. The site stays down until you notice.
3. **It does not survive a reboot.** Restart the instance and the API is gone,
   even though nginx and MongoDB come back on their own.

PM2 is a process manager that fixes all three. It runs the API in the
background, detached from your session; restarts it automatically if it
crashes; and can register itself with systemd so it starts at boot. It also
keeps rotating logs and gives you a simple way to read them.

> systemd could do this too — PM2 is used here because it needs no unit file
> and its logging and status commands are easier to learn.

### Set it up

```bash
sudo npm install -g pm2

cd ~/student_mngmt_system/backend
pm2 start npm --name student-api -- start
```

Check it:

```bash
pm2 status          # status should be "online"
pm2 logs student-api --lines 20
```

### Make it survive reboots

```bash
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

`pm2 save` records which processes are running. `pm2 startup` then **prints
another command** beginning with `sudo env PATH=...`.

**Copy that printed command, paste it, and run it.** That is the step that
registers PM2 with systemd. Skipping it means your API will not come back after
a reboot — a very common cause of "it worked yesterday".

### Commands you will use later

```bash
pm2 restart student-api    # after pulling new backend code
pm2 logs student-api       # live logs — your first stop when debugging
pm2 status                 # is it online, how many times has it restarted
pm2 monit                  # live CPU and memory
pm2 stop student-api       # stop without removing it
```

---

## 8. API reference

Base URL: `http://localhost:5000/api` locally, or `http://<EC2_PUBLIC_IP>/api`
in deployment.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check — used by the frontend footer indicator |
| GET | `/students` | List students — `?search=&course=&semester=&sort=&page=&limit=` |
| GET | `/students/stats` | Dashboard counts, per-course and per-semester breakdown, 5 recent |
| GET | `/students/meta` | Course, gender and semester options for the form dropdowns |
| GET | `/students/:id` | One student, including the virtual `age` field |
| POST | `/students` | Create a student |
| PUT | `/students/:id` | Update a student |
| DELETE | `/students/:id` | Delete a student |

**Success response:**

```jsonc
{
  "success": true,
  "data": { /* ... */ },
  "pagination": { "page": 1, "limit": 10, "total": 40, "totalPages": 4 }
}
```

**Failure response:**

```jsonc
{
  "success": false,
  "message": "Validation failed",
  "errors": { "email": "Please provide a valid email" }
}
```

The `errors` object is keyed by field name, which is how the registration form
attaches a server-side error to the right input.

**Status codes:** `201` created · `400` validation or bad ObjectId · `404` not
found · `409` duplicate email or roll number · `503` database unreachable.

Try a few by hand:

```bash
curl "http://localhost:5000/api/students?search=SC-2026&limit=5"
curl http://localhost:5000/api/students/stats
```

---

## 9. Backend troubleshooting

| What you see | Likely cause | Fix |
|---|---|---|
| `connect ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running | `sudo systemctl start mongod` |
| `MONGO_URI is not set` | No `.env`, or it is in the wrong folder | It must be `backend/.env`, beside `package.json` |
| `EADDRINUSE: address already in use :::5000` | Something is already on port 5000 | `pm2 status`, or change `PORT` in `.env` |
| `409` on every create | Duplicate email or roll number | Both must be unique across all students |
| API works, browser shows nothing | Frontend or nginx issue, not the backend | See [FRONTEND_SETUP.md](FRONTEND_SETUP.md) |
| Dashboard shows zeros | Database is empty | `npm run seed` |
| Changes to code do nothing | Server not restarted | `pm2 restart student-api`, or use `npm run dev` |

Reading the logs:

```bash
pm2 logs student-api --lines 50     # on the server
sudo journalctl -u mongod -n 50     # database errors
```

`morgan` logs every request as it arrives, so if a request never appears in the
log, it never reached the API — the problem is in nginx or the frontend, not
here.
