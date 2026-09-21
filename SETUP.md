# Deploying the Student Management System on a single EC2 instance

A step-by-step guide to take this project from your laptop to a live URL on one
Amazon EC2 instance — MongoDB, the Express API, and the React build all on the
same machine, with nginx in front.

> **This is a teaching demo.** It runs over plain HTTP with no login system.
> Read [Before you put this anywhere public](#before-you-put-this-anywhere-public)
> at the end before using it with real data.

**Time needed:** about 45 minutes the first time.

**Assumes Amazon Linux 2023.** Amazon Linux 2 is a different system — it uses
`yum` and `amazon-linux-extras`, and these commands will not work there.

---

## Contents

1. [What you are building](#1-what-you-are-building)
2. [Launch the EC2 instance](#2-launch-the-ec2-instance)
3. [Connect over SSH](#3-connect-over-ssh)
4. [Install git, Node.js, MongoDB and nginx](#4-install-git-nodejs-mongodb-and-nginx)
5. [Clone the project](#5-clone-the-project)
6. [Set up the backend](#6-set-up-the-backend) → **[BACKEND_SETUP.md](BACKEND_SETUP.md)**
7. [Set up the frontend](#7-set-up-the-frontend) → **[FRONTEND_SETUP.md](FRONTEND_SETUP.md)**
8. [Configure nginx](#8-configure-nginx)
9. [Check that everything works](#9-check-that-everything-works)
10. [Deploying changes later](#10-deploying-changes-later)
11. [Troubleshooting](#11-troubleshooting)
12. [Before you put this anywhere public](#before-you-put-this-anywhere-public)

---

## 1. What you are building

Everything lives on one instance. Only port 80 is open to the world:

```
                    ┌─────────────────── EC2 instance ────────────────────┐
                    │                                                     │
  Browser  ──:80──▶ │  nginx                                              │
                    │    ├─ /          → /var/www/student-mngmt (React)   │
                    │    └─ /api/…     → 127.0.0.1:5000                   │
                    │                          │                          │
                    │                     Express API  (PM2)              │
                    │                          │                          │
                    │                     MongoDB  127.0.0.1:27017        │
                    │                                                     │
                    └─────────────────────────────────────────────────────┘
```

Three things are worth understanding before you start, because they explain
most of the decisions later in this guide:

**The React app is not a running program.** `npm run build` turns it into plain
HTML, CSS and JavaScript files. nginx just hands those files to the browser.
There is no Node process for the frontend in production.

**nginx is the only thing listening publicly.** The API on port 5000 and
MongoDB on port 27017 are bound to `127.0.0.1`, which means they can only be
reached from inside the instance. Nothing outside AWS can connect to them
directly.

**The browser only ever talks to one address.** Because nginx serves the app
*and* forwards `/api` to the backend, the frontend and API share an origin.
That is why `frontend/.env` contains `VITE_API_URL=/api` — a relative path, not
`http://localhost:5000`. It also means you never have to think about CORS.

### Why nginx?

Express *can* serve files by itself, so it is fair to ask what nginx adds. Four
things, and the first is the one that actually forces the decision:

1. **It lets one port serve two different things.** A browser connects to port
   80. The React files and the API both need to be reachable there. nginx sits
   on port 80 and decides per request: `/api/...` goes to Express, everything
   else is a file. Without it you would either expose a second port and deal
   with CORS, or make Express serve the frontend too.
2. **It serves static files far better than Node.** Handing over a CSS file is
   exactly what nginx is built for. Express would do it in JavaScript, slower,
   while blocking the same event loop your API depends on.
3. **It keeps the API off the public internet.** Express listens on
   `127.0.0.1:5000` — unreachable from outside. Only nginx is exposed, so it is
   the single place to add TLS, rate limiting or access rules later.
4. **It handles the single-page-app fallback.** The URL `/students/abc123` is
   not a file on disk; it only exists inside React. nginx is told to answer
   with `index.html` for unknown paths so React Router can take over
   (step 8) — without it, refreshing a profile page returns 404.

### Why PM2?

`npm start` runs the API attached to your terminal. On a server that fails in
three ways: it **dies when you log out**, it **does not restart after a crash**,
and it **does not come back after a reboot**. The site would be down until you
noticed and logged in to fix it.

PM2 is a process manager. It runs the API in the background detached from your
session, restarts it automatically if it crashes, registers with systemd so it
starts at boot, and collects logs you can read with one command. Setting it up
is part of [BACKEND_SETUP.md](BACKEND_SETUP.md).

> systemd alone could do this — PM2 is used here because it needs no unit file
> and its status and log commands are easier to learn.

Note that nginx and MongoDB do **not** need PM2: both install as systemd
services and already restart on boot by themselves.

---

## 2. Launch the EC2 instance

In the AWS Console, go to **EC2 → Instances → Launch instances**.

| Setting | Value | Why |
|---|---|---|
| Name | `student-mngmt` | Anything you like |
| AMI | **Amazon Linux 2023** | Every command below assumes AL2023 (`dnf`, not `yum`) |
| Architecture | 64-bit (x86) | The MongoDB repo line below is for x86 |
| Instance type | **t3.small** | 2 GB RAM. `t3.micro` (1 GB) works but see the note below |
| Key pair | Create a new one, download the `.pem` | Your only way to log in — do not lose it |
| Storage | 16 GB gp3 | 8 GB fills up fast once MongoDB and npm caches grow |

### Security group

This controls who can reach your instance. Create a new one with exactly two
inbound rules:

| Type | Port | Source | Why |
|---|---|---|---|
| SSH | 22 | **My IP** | So only you can log in |
| HTTP | 80 | Anywhere (`0.0.0.0/0`) | So people can open the site |

**Do not add rules for 5000 or 27017.** The API and database are reached
internally through nginx. Opening 27017 would expose your database to the
entire internet — this is one of the most common ways student projects get
their data wiped.

Click **Launch instance**. Once it is running, copy the **Public IPv4 address**
from the instance details — this guide refers to it as `<EC2_PUBLIC_IP>`.

> **That address is temporary.** AWS hands out a new public IP every time the
> instance is stopped and started again (a reboot keeps it). If that happens,
> look up the new address in the console, and update `CLIENT_ORIGIN` in
> `backend/.env` to match. Attaching an Elastic IP pins the address
> permanently, if you later want one.

> **If you chose t3.micro (1 GB RAM):** add swap space after connecting,
> otherwise Linux may kill MongoDB when memory runs short.
> ```bash
> sudo fallocate -l 2G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

---

## 3. Connect over SSH

On your laptop, from the folder holding the `.pem` file:

```bash
chmod 400 student-mngmt.pem
ssh -i student-mngmt.pem ec2-user@<EC2_PUBLIC_IP>
```

`chmod 400` is required — SSH refuses to use a key that other users on your
machine could read. Accept the fingerprint prompt with `yes`.

Everything from here runs **on the instance**, not your laptop.

Start with the system updates:

```bash
sudo dnf update -y
```

---

## 4. Install git, Node.js, MongoDB and nginx

### git

The Amazon Linux image does not ship with git, and you need it to pull the
project down in the next step:

```bash
sudo dnf install -y git nano
git --version
```

`nano` comes along because the Amazon Linux image ships only `vi`, and this
guide edits a few files. If either is already installed, dnf reports that and
moves on.

### Node.js 20

Amazon Linux's default repository carries an older Node. Add NodeSource:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

node -v    # expect v20.x
npm -v
```

> If the NodeSource script ever fails, Amazon Linux 2023 also packages Node 20
> directly: `sudo dnf install -y nodejs20 nodejs20-npm`. Check `node -v`
> afterwards — this route can install the binary as `node-20`, in which case
> use `sudo alternatives --config node` to make it the default `node`.

### MongoDB 7

MongoDB is not in Amazon Linux's repositories, so add the official one by
creating a repo file:

```bash
sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo > /dev/null <<'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF

sudo dnf install -y mongodb-org
```

That `baseurl` is specific to Amazon Linux 2023 and x86_64 — it is why the AMI
and architecture choices in step 2 matter. On a Graviton (arm64) instance you
would need the `aarch64` path instead.

Start it, and set it to start automatically on every reboot:

```bash
sudo systemctl enable --now mongod
sudo systemctl status mongod    # look for "active (running)", press q to exit
```

By default MongoDB listens only on `127.0.0.1`. Leave it that way.

### nginx

```bash
sudo dnf install -y nginx
sudo systemctl enable --now nginx
```

Open `http://<EC2_PUBLIC_IP>` in a browser now — you should see the nginx test
page ("Test Page for the Nginx HTTP Server on Amazon Linux"). If you do, your
security group and networking are correct, and any later problem is inside the
instance rather than in AWS. You will replace that page in step 8.

---

## 5. Clone the project

This step assumes the project is already pushed to a GitHub repository. Replace
the URL below with your own.

```bash
cd ~
git clone https://github.com/<YOUR_GITHUB_USERNAME>/student_mngmt_system.git
cd student_mngmt_system
ls     # backend  frontend  README.md  SETUP.md
```

For a private repository, GitHub will ask for credentials — use a **personal
access token** as the password, not your account password.

---

## 6. Set up the backend

Get the API and database working first. If the backend is broken, the frontend
and nginx will both look broken too, and you will debug the wrong thing.

**→ Follow [BACKEND_SETUP.md](BACKEND_SETUP.md) now**, then come back here.

It covers installing the dependencies, creating `backend/.env` (use the EC2
values, with your instance's public IP), loading the sample data, and setting
up PM2 so the API keeps running.

Before returning, confirm this works on the instance:

```bash
curl http://localhost:5000/api/health
```

It must return
`{"success":true,"message":"Student Management API is running"}`, and
`pm2 status` must show `student-api` as **online**.

---

## 7. Set up the frontend

**→ Follow [FRONTEND_SETUP.md](FRONTEND_SETUP.md) now**, then come back here.

It covers installing the dependencies, creating `frontend/.env` with
`VITE_API_URL=/api`, running `npm run build`, and copying the result into
`/var/www/student-mngmt` where nginx will serve it.

Before returning, confirm the files are in place:

```bash
ls /var/www/student-mngmt        # expect index.html, favicon.svg, assets/
```

Opening the site in a browser will still show the nginx test page at this
point — nothing is serving your build yet. That is the next step.

---

## 8. Configure nginx

Amazon Linux has no `sites-available` / `sites-enabled` folders — that is a
Debian convention. Here, `/etc/nginx/nginx.conf` simply includes every `.conf`
file in `/etc/nginx/conf.d/`, so your site goes there.

### First, disable the stock welcome page

The nginx package ships its own `server` block inside `nginx.conf`, already
claiming port 80 as the default. If you leave it, nginx will refuse to start
with a *"duplicate default server"* error.

```bash
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
sudo nano /etc/nginx/nginx.conf
```

Find the `server { … }` block (it starts around line 38, with
`listen 80 default_server;` and `root /usr/share/nginx/html;`) and comment out
every line of it by putting a `#` at the start, from `server {` down to its
closing `}`. Leave the rest of the file — the `http { … }` wrapper and the
`include /etc/nginx/conf.d/*.conf;` line — exactly as they are.

> Keeping the backup means one `sudo cp /etc/nginx/nginx.conf.backup
> /etc/nginx/nginx.conf` undoes any mistake.

### Then create your site config

```bash
sudo nano /etc/nginx/conf.d/student-mngmt.conf
```

Paste this exactly:

```nginx
server {
    listen 80 default_server;
    server_name _;

    root /var/www/student-mngmt;
    index index.html;

    # Anything starting with /api goes to the Express API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache the hashed build assets aggressively — their names change on rebuild
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Everything else falls back to index.html so React Router can handle it
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

The **`try_files … /index.html`** line matters more than it looks. This is a
single-page app: the route `/students/abc123` exists only inside React, not as
a file on disk. Without that fallback, opening a student profile directly or
pressing refresh on one returns a 404 from nginx.

### Test the config, then load it

```bash
sudo nginx -t        # must say "syntax is ok" and "test is successful"
sudo systemctl reload nginx
```

Never skip `sudo nginx -t`. Reloading a broken config takes the site down.

If the test reports **`duplicate default server for 0.0.0.0:80`**, the stock
block in `nginx.conf` is still active — go back and finish commenting it out.

---

## 9. Check that everything works

Open **`http://<EC2_PUBLIC_IP>`** in a browser. Work through this list:

- [ ] The dashboard loads with student counts, not zeros or dashes
- [ ] The footer says **API online** — that indicator polls `/api/health` every
      60 seconds, so it is a live check of the backend
- [ ] **Students** lists records, and search and the filters return results
- [ ] Opening a student profile works, and **pressing refresh on that page still
      works** (this proves the `try_files` fallback)
- [ ] **Register student** creates a record and shows a success toast
- [ ] Editing and deleting a record both work

From the instance you can test the layers separately:

```bash
curl http://localhost:5000/api/health        # the API directly
curl http://localhost/api/health             # the API through nginx
curl -I http://localhost/                    # the React app (expect 200)
```

If the first works and the second does not, the problem is in your nginx
config. If both work but the browser shows nothing, the problem is the frontend
build or the security group.

Finally, reboot once to confirm everything comes back by itself:

```bash
sudo reboot
```

Wait a minute, reconnect, and reload the site. MongoDB, the API and nginx
should all be running without you touching anything. If the API is missing, you
skipped the `pm2 startup` follow-up command in
[BACKEND_SETUP.md](BACKEND_SETUP.md) section 7.

---

## 10. Deploying changes later

After pushing new code from your laptop, on the instance:

```bash
cd ~/student_mngmt_system
git pull

# If the backend changed
cd backend
npm install                 # only needed when dependencies changed
pm2 restart student-api

# If the frontend changed
cd ../frontend
npm install                 # only needed when dependencies changed
npm run build
sudo cp -r dist/* /var/www/student-mngmt/
```

nginx does not need reloading for a new frontend build — it reads the files
fresh from disk. You only reload nginx when its own config changes.

> **Tip:** if the browser still shows the old version, hard-refresh with
> `Ctrl+Shift+R`. The filenames in `assets/` are content-hashed, so this is
> almost always a cached `index.html`, not a failed deploy.

---

## 11. Troubleshooting

| What you see | Likely cause | Fix |
|---|---|---|
| Browser times out entirely | Port 80 not open, or nginx stopped | Check the security group; `sudo systemctl status nginx` |
| `502 Bad Gateway` | nginx is up but the API is not | `pm2 status`, then `pm2 logs student-api` |
| Site loads but footer says **API unreachable** | Same as above, or the `/api/` block is missing | `curl http://localhost:5000/api/health` |
| "The database is unavailable" in the UI | MongoDB is not running | `sudo systemctl status mongod`, then `sudo systemctl start mongod` |
| `403 Forbidden` | nginx cannot read the files | Confirm the build is in `/var/www/student-mngmt` |
| `nginx -t`: **duplicate default server** | Stock block in `nginx.conf` still active | Finish commenting it out (step 8) |
| `502` with *Permission denied* in the nginx log | SELinux blocking the proxy | `sudo setsebool -P httpd_can_network_connect 1` |
| Dashboard works, refresh on a profile gives 404 | `try_files` fallback missing | Re-check the `location /` block, `sudo nginx -t`, reload |
| Everything empty, no errors | Database has no data | `cd ~/student_mngmt_system/backend && npm run seed` |
| Site vanished after reboot | PM2 startup not registered | Redo [BACKEND_SETUP.md](BACKEND_SETUP.md) §7, including the printed `sudo env PATH=…` command |
| `npm install` killed on t3.micro | Out of memory | Add swap (see step 2) |

Where to look, in order:

```bash
pm2 logs student-api --lines 50        # application errors
sudo tail -50 /var/log/nginx/error.log # nginx errors
sudo journalctl -u mongod -n 50        # database errors
sudo journalctl -u nginx -n 50         # nginx service-level errors
```

Amazon Linux 2023 runs SELinux in *permissive* mode by default, so it logs
policy violations without enforcing them — it is rarely the cause of a problem
here. If someone has switched it to enforcing (`getenforce` says `Enforcing`),
the `httpd_can_network_connect` fix above is the one you need to let nginx
reach the API.

---

## Before you put this anywhere public

This deployment is built for teaching and demonstration. Three things are
deliberately missing, and you should know exactly what each one means.

**There is no authentication.** The API has no login, no sessions and no
permission checks. Anyone who knows the IP address can list, create, edit and
delete every student record — from a browser or with a single `curl` command.
The "Registrar's Office" badge in the top bar is interface decoration, not a
logged-in user.

**There is no HTTPS.** All traffic is plain HTTP, readable by anyone on the
network path. Certbot cannot issue a certificate for a bare IP address, so TLS
needs a domain name. If you want HTTPS without buying a domain, services like
`nip.io` map `<your-ip>.nip.io` to your IP and Let's Encrypt will issue
certificates for those hostnames.

**The database has no password.** MongoDB runs without authentication enabled.
This is acceptable *only* because it is bound to `127.0.0.1` and port 27017 is
closed in the security group. If you ever open that port, you have published
your database to the internet.

Taken together: use seeded sample data, not real student information.

If you want to lock the demo down to just yourself, change the port 80 rule in
the security group from `0.0.0.0/0` to **My IP**. The site then works for you
and is invisible to everyone else — a one-click change with no code involved.

To take the whole thing down, terminate the instance from the EC2 console. That
stops all charges for it. If you added an Elastic IP along the way, release it
too — AWS bills for one that is allocated but not attached to a running
instance.
