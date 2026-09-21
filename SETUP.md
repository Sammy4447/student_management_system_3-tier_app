# Deploying the Student Management System on a single EC2 instance

A step-by-step guide to take this project from your laptop to a live URL on one
Amazon EC2 instance — MongoDB, the Express API, and the React build all on the
same machine, with nginx in front.

> **This is a teaching demo.** It runs over plain HTTP with no login system.
> Read [Before you put this anywhere public](#before-you-put-this-anywhere-public)
> at the end before using it with real data.

**Time needed:** about 45 minutes the first time.

---

## Contents

1. [What you are building](#1-what-you-are-building)
2. [Put the code on GitHub](#2-put-the-code-on-github)
3. [Launch the EC2 instance](#3-launch-the-ec2-instance)
4. [Give it a fixed IP address](#4-give-it-a-fixed-ip-address)
5. [Connect over SSH](#5-connect-over-ssh)
6. [Install Node.js, MongoDB and nginx](#6-install-nodejs-mongodb-and-nginx)
7. [Clone the project](#7-clone-the-project)
8. [Set up the backend](#8-set-up-the-backend)
9. [Keep the API running with PM2](#9-keep-the-api-running-with-pm2)
10. [Build the frontend](#10-build-the-frontend)
11. [Configure nginx](#11-configure-nginx)
12. [Check that everything works](#12-check-that-everything-works)
13. [Deploying changes later](#13-deploying-changes-later)
14. [Troubleshooting](#14-troubleshooting)
15. [Before you put this anywhere public](#before-you-put-this-anywhere-public)

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

---

## 2. Put the code on GitHub

The instance will pull the code with `git clone`, so it needs to be on GitHub
first. If your project is already pushed, skip to step 3.

From your laptop, in the project folder:

```bash
cd "/home/sammy/Sunway College/student_mngmt_system"

git init
git add .
git commit -m "Student management system"
```

Create an empty repository on GitHub (no README, no .gitignore — you already
have both), then:

```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/student_mngmt_system.git
git branch -M main
git push -u origin main
```

### What does not get pushed

`.gitignore` excludes `node_modules`, `dist` and **`.env`**. That is deliberate
— environment files hold configuration specific to each machine, and one day
they will hold passwords. You will create fresh `.env` files on the server in
step 8. Nothing is missing; this is how it is supposed to work.

---

## 3. Launch the EC2 instance

In the AWS Console, go to **EC2 → Instances → Launch instances**.

| Setting | Value | Why |
|---|---|---|
| Name | `student-mngmt` | Anything you like |
| AMI | **Ubuntu Server 22.04 LTS** | Every command below assumes Ubuntu 22.04 |
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

Click **Launch instance**.

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

## 4. Give it a fixed IP address

By default, an instance's public IP **changes every time you stop and start
it**. An Elastic IP pins it permanently.

**EC2 → Elastic IPs → Allocate Elastic IP address → Allocate**, then with it
selected: **Actions → Associate Elastic IP address**, choose your instance, and
associate.

Write the address down. This guide refers to it as `<YOUR_ELASTIC_IP>`.

> An Elastic IP is free while it is attached to a *running* instance. AWS
> charges a small hourly fee for one that is allocated but unused, so release it
> if you tear the project down.

---

## 5. Connect over SSH

On your laptop, from the folder holding the `.pem` file:

```bash
chmod 400 student-mngmt.pem
ssh -i student-mngmt.pem ubuntu@<YOUR_ELASTIC_IP>
```

`chmod 400` is required — SSH refuses to use a key that other users on your
machine could read. Accept the fingerprint prompt with `yes`.

Everything from here runs **on the instance**, not your laptop.

Start with the system updates:

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 6. Install Node.js, MongoDB and nginx

### Node.js 20

Ubuntu's own `apt install nodejs` gives an old version. Use NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v    # expect v20.x
npm -v
```

### MongoDB 7

MongoDB is not in Ubuntu's default repositories, so add the official one:

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
  | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
```

Start it, and set it to start automatically on every reboot:

```bash
sudo systemctl enable --now mongod
sudo systemctl status mongod    # look for "active (running)", press q to exit
```

By default MongoDB listens only on `127.0.0.1`. Leave it that way.

### nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Open `http://<YOUR_ELASTIC_IP>` in a browser now — you should see the default
"Welcome to nginx!" page. If you do, your security group and networking are
correct, and any later problem is inside the instance rather than in AWS.

---

## 7. Clone the project

```bash
cd ~
git clone https://github.com/<YOUR_GITHUB_USERNAME>/student_mngmt_system.git
cd student_mngmt_system
ls     # backend  frontend  README.md  SETUP.md
```

For a private repository, GitHub will ask for credentials — use a **personal
access token** as the password, not your account password.

---

## 8. Set up the backend

```bash
cd ~/student_mngmt_system/backend
npm install
```

### Create the environment file

Remember, `.env` was not in the repository. Create it on the server:

```bash
nano .env
```

Paste this, substituting your Elastic IP:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/student_mngmt_system
CLIENT_ORIGIN=http://<YOUR_ELASTIC_IP>
```

Save with `Ctrl+O`, `Enter`, then exit with `Ctrl+X`.

What each line does:

- **`PORT`** — where Express listens. nginx forwards to this port, so it must
  match the nginx config in step 11.
- **`MONGO_URI`** — `127.0.0.1` because MongoDB is on this same machine. The
  database `student_mngmt_system` is created automatically on first write.
- **`CLIENT_ORIGIN`** — the allowed CORS origin. Requests arrive through nginx
  from the same origin, so this rarely matters in practice, but setting it
  correctly keeps the configuration honest.

### Load sample data (optional)

```bash
npm run seed
```

This inserts 40 sample students so the dashboard and list pages have something
to show. **It deletes all existing students first**, so only run it on a fresh
database — never after you have entered real records.

### Test it before moving on

```bash
npm start
```

You should see:

```
MongoDB connected: 127.0.0.1/student_mngmt_system
Server listening on http://localhost:5000
```

In the same terminal, press `Ctrl+C` to stop it, then verify the API responds:

```bash
npm start &            # start in the background
sleep 3
curl http://localhost:5000/api/health
curl "http://localhost:5000/api/students?limit=2"
kill %1                # stop the background process
```

The health check should return
`{"success":true,"message":"Student Management API is running"}`.

Get this working before continuing. If the API is broken, every later step will
look broken too.

---

## 9. Keep the API running with PM2

`npm start` dies the moment you close your SSH session, and nothing restarts it
if it crashes or the instance reboots. PM2 is a process manager that solves
both.

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

Now make it survive reboots:

```bash
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

That last command **prints another command** beginning with `sudo env
PATH=...`. Copy the printed command, paste it, and run it. This registers PM2
as a systemd service. Skipping it means your API will not come back after a
reboot.

Useful commands later:

```bash
pm2 restart student-api    # after pulling new code
pm2 logs student-api       # live logs — your first stop when debugging
pm2 monit                  # live CPU and memory
```

---

## 10. Build the frontend

```bash
cd ~/student_mngmt_system/frontend
npm install
```

Create its environment file (also excluded from git):

```bash
echo "VITE_API_URL=/api" > .env
```

A **relative** path is the whole trick: the browser requests
`http://<YOUR_ELASTIC_IP>/api/students`, nginx sees the `/api` prefix and
forwards it to the API. If you hardcoded `http://localhost:5000` here it would
break for every visitor, because "localhost" would mean *their* computer.

> The code falls back to `/api` if this file is missing, so it will work either
> way — but being explicit is better.

Build it:

```bash
npm run build
```

This creates `dist/`, containing `index.html` and a hashed `assets/` folder.
Vite reads `.env` at **build time**, so if you ever change that file you must
run `npm run build` again for it to take effect.

Copy the build to the folder nginx will serve:

```bash
sudo mkdir -p /var/www/student-mngmt
sudo cp -r dist/* /var/www/student-mngmt/
```

> **Why copy instead of pointing nginx at the home directory?** nginx runs as
> the `www-data` user, which cannot read inside `/home/ubuntu` by default. That
> produces a confusing `403 Forbidden`. Serving from `/var/www` avoids it.

---

## 11. Configure nginx

Create the site configuration:

```bash
sudo nano /etc/nginx/sites-available/student-mngmt
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

Enable the site, disable the default one, and reload:

```bash
sudo ln -s /etc/nginx/sites-available/student-mngmt /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

sudo nginx -t        # must say "syntax is ok" and "test is successful"
sudo systemctl reload nginx
```

Never skip `sudo nginx -t`. Reloading a broken config takes the site down.

---

## 12. Check that everything works

Open **`http://<YOUR_ELASTIC_IP>`** in a browser. Work through this list:

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
skipped the printed command in step 9.

---

## 13. Deploying changes later

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

## 14. Troubleshooting

| What you see | Likely cause | Fix |
|---|---|---|
| Browser times out entirely | Port 80 not open, or nginx stopped | Check the security group; `sudo systemctl status nginx` |
| `502 Bad Gateway` | nginx is up but the API is not | `pm2 status`, then `pm2 logs student-api` |
| Site loads but footer says **API unreachable** | Same as above, or the `/api/` block is missing | `curl http://localhost:5000/api/health` |
| "The database is unavailable" in the UI | MongoDB is not running | `sudo systemctl status mongod`, then `sudo systemctl start mongod` |
| `403 Forbidden` | nginx cannot read the files | Confirm the build is in `/var/www/student-mngmt` |
| Dashboard works, refresh on a profile gives 404 | `try_files` fallback missing | Re-check the `location /` block, `sudo nginx -t`, reload |
| Everything empty, no errors | Database has no data | `cd ~/student_mngmt_system/backend && npm run seed` |
| Site vanished after reboot | PM2 startup not registered | Re-run step 9, including the printed `sudo env PATH=…` command |
| `npm install` killed on t3.micro | Out of memory | Add swap (see step 3) |

Where to look, in order:

```bash
pm2 logs student-api --lines 50        # application errors
sudo tail -50 /var/log/nginx/error.log # nginx errors
sudo journalctl -u mongod -n 50        # database errors
```

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

To take the whole thing down: terminate the instance, then release the Elastic
IP so AWS stops charging for it.
