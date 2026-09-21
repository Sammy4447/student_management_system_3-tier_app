# Frontend setup

Everything needed to run the React app in development, and to build and deploy
it for production.

If you are deploying to EC2, [SETUP.md](SETUP.md) sends you here at step 7.
Finish this file, then go back to it for the nginx configuration.

> The backend should already be running before you start. If it is not, do
> [BACKEND_SETUP.md](BACKEND_SETUP.md) first — the frontend has no data of its
> own and every page will sit empty without it.

---

## Contents

1. [What the frontend is](#1-what-the-frontend-is)
2. [Prerequisites](#2-prerequisites)
3. [Install the dependencies](#3-install-the-dependencies)
4. [Create the environment file](#4-create-the-environment-file)
5. [Run it in development](#5-run-it-in-development)
6. [Build it for production](#6-build-it-for-production)
7. [Deploy the build](#7-deploy-the-build)
8. [Where things live](#8-where-things-live)
9. [Frontend troubleshooting](#9-frontend-troubleshooting)

---

## 1. What the frontend is

A single-page application built with **React 18**, routed by **React Router**,
bundled by **Vite**, and talking to the API through **axios**.

The important thing to understand about production: **the frontend is not a
running program there.** `npm run build` compiles it once into plain HTML, CSS
and JavaScript files. A web server hands those files to the browser, and all
the React code then runs inside the visitor's browser. There is no Node process
for the frontend on the server — that is only true during development, where
Vite runs a dev server for hot reloading.

```
frontend/
├── .env                      ← you create this; never committed
├── index.html                The single HTML page everything mounts into
├── vite.config.js            Dev server + the /api proxy used in development
├── dist/                     Created by `npm run build` — this is what ships
└── src/
    ├── App.jsx               Routes
    ├── hooks.js              useMeta (dropdown options), useDebounced (search)
    ├── api/                  axios client and one function per endpoint
    ├── components/           Layout, StudentForm, Avatar, Toast, dialogs
    ├── pages/                Dashboard, StudentList, StudentDetails, Add, Edit
    └── styles/index.css      All styling, with design tokens at the top
```

---

## 2. Prerequisites

- **Node.js 20+** — check with `node -v`
- **The backend running**, and reachable

---

## 3. Install the dependencies

```bash
cd frontend      # on EC2: cd ~/student_mngmt_system/frontend
npm install
```

| Package | What it does |
|---|---|
| `react`, `react-dom` | The UI library |
| `react-router-dom` | Client-side routing — `/students/:id` without a page reload |
| `axios` | HTTP calls to the API |
| `vite` | Dev server and production bundler |

---

## 4. Create the environment file

Like the backend's, this file is gitignored and will not exist in a fresh
clone. Create it inside `frontend/`:

```bash
echo "VITE_API_URL=/api" > .env
```

That single value is the API's base URL, and a **relative** path is the whole
trick:

- In **development**, Vite's dev server proxies `/api` to
  `http://localhost:5000` (configured in `vite.config.js`), so there is no CORS
  to deal with.
- In **production**, the browser requests `http://<EC2_PUBLIC_IP>/api/students`,
  and nginx forwards anything starting with `/api` to the API on port 5000.

If you hardcoded `http://localhost:5000` here instead, the deployed site would
break for every visitor — "localhost" would mean *their* computer, not your
server.

> The code falls back to `/api` when the file is missing
> (`import.meta.env.VITE_API_URL || '/api'`), so it works either way. Being
> explicit is still better.

**Vite reads `.env` at build time, not at run time.** If you ever change this
file, you must run `npm run build` again for it to take effect.

---

## 5. Run it in development

```bash
npm run dev
```

Open <http://localhost:5173>. The page hot-reloads as you edit files.

This is for your laptop. Do not use `npm run dev` to serve the site on EC2 — it
is a development server: slower, unminified, and not built to face the
internet.

---

## 6. Build it for production

```bash
npm run build
```

This creates `dist/`:

```
dist/
├── index.html
├── favicon.svg
└── assets/
    ├── index-<hash>.css
    └── index-<hash>.js
```

The `<hash>` in those filenames changes whenever the content changes. That is
what makes aggressive browser caching safe — a new build produces new
filenames, so visitors never get a stale bundle.

Expect roughly 250 KB of JavaScript, about 81 KB gzipped.

---

## 7. Deploy the build

**On EC2**, copy the build into the folder nginx serves:

```bash
sudo mkdir -p /var/www/student-mngmt
sudo cp -r dist/* /var/www/student-mngmt/
```

> **Why copy instead of pointing nginx straight at `~/student_mngmt_system/frontend/dist`?**
> nginx runs as the `nginx` user, which cannot read inside `/home/ec2-user` by
> default. Pointing it there produces a confusing `403 Forbidden`. Serving from
> `/var/www` sidesteps the whole problem.

nginx does **not** need reloading after a new build — it reads the files fresh
from disk on every request. You only reload nginx when its own config changes.

### Redeploying after a change

```bash
cd ~/student_mngmt_system
git pull

cd frontend
npm install                 # only when dependencies changed
npm run build
sudo cp -r dist/* /var/www/student-mngmt/
```

If the browser still shows the old version, hard-refresh with
`Ctrl+Shift+R`. Because asset filenames are hashed, a stale page is almost
always a cached `index.html` rather than a failed deploy.

---

## 8. Where things live

Useful when you want to change something:

| You want to change | Edit |
|---|---|
| Colours, fonts, spacing, radii | `src/styles/index.css` — tokens are at the top under `:root` |
| The sidebar, top bar or footer | `src/components/Layout.jsx` |
| Registration/edit form fields | `src/components/StudentForm.jsx` |
| Dashboard tiles and charts | `src/pages/Dashboard.jsx` |
| Table columns, filters, sorting | `src/pages/StudentList.jsx` |
| Which URL shows which page | `src/App.jsx` |
| API calls | `src/api/students.js` |

Two notes that save time:

**Changing `--accent` in `index.css` reskins the entire app.** Every green in
the interface derives from that one token.

**Course and semester options are not in the frontend.** They come from the API
(`/api/students/meta`), defined in `backend/src/models/Student.js`. Change them
there and both the dropdowns and the database validation stay in agreement.

---

## 9. Frontend troubleshooting

| What you see | Likely cause | Fix |
|---|---|---|
| Blank white page | A JavaScript error | Open the browser console (F12) and read the first error |
| Footer says **API unreachable** | Backend down, or `/api` not proxied | `curl http://localhost:5000/api/health` |
| Pages load but all data is empty | Database has no records | Run `npm run seed` in `backend/` |
| Refreshing a profile page gives 404 | nginx `try_files` fallback missing | See [SETUP.md](SETUP.md) step 8 |
| CSS missing, page looks like plain text | `assets/` did not get copied | Re-run the `sudo cp -r dist/*` command |
| `403 Forbidden` | nginx cannot read the files | Confirm the build landed in `/var/www/student-mngmt` |
| Changes not showing after a rebuild | Cached `index.html` | Hard-refresh with `Ctrl+Shift+R` |
| Network tab shows calls to `localhost:5000` | `VITE_API_URL` was absolute at build time | Set it to `/api` and rebuild |

The browser's **Network** tab is the fastest diagnostic here. Look at one
failing `/api/...` request:

- **404 from nginx** — the `/api/` proxy block is wrong or missing
- **502** — nginx reached the server but the API is not running
- **Request never appears** — the frontend never sent it; it is a JavaScript
  error, so check the Console tab
