# Deployment

This guide puts iShelf and Recipes on a Hetzner Cloud server in Germany (EU, as the privacy policy says) with its own `.cz` domain and HTTPS. Every command is meant to be copied as it is; replace only the values in angle brackets, for example `<server-ip>`.

Production uses `docker-compose.production.yml`:

| Service | What it does |
| --- | --- |
| `caddy` | Serves the built PWA, forwards `/api` to the backend and gets and renews the HTTPS certificate automatically (Let's Encrypt) |
| `backend` | The API with two processes; database migrations run on start; `/docs` is turned off |
| `worker` | Daily jobs at 8:00 (push notifications, deleting accounts after the 14-day period) |
| `database` | PostgreSQL, not reachable from the internet |
| `backup` | A database backup every night at 3:00 into `backups/`, the last 14 days are kept |

Planned costs (financial plan): server with backups about 200 CZK a month, domain about 200 CZK for the first year.

## 1. Domain

1. Check that the name is free in the official registry search of CZ.NIC: https://www.nic.cz/whois/ (type the name with `.cz`, without `www`).
2. Register it with any accredited registrar; CZ.NIC explains the process and links the list of registrars: https://www.nic.cz/page/313/
3. Keep the registrar's DNS administration open; you will add a record in step 4.

## 2. SSH key (on your Windows computer)

Open PowerShell and run:

```
ssh-keygen -t ed25519 -C "ishelf-server"
```

Press Enter to keep the default location and choose a passphrase. The public key is in `C:\Users\<you>\.ssh\id_ed25519.pub`; you will paste its content into Hetzner. Never share the file without `.pub`.

## 3. Hetzner server

Official pages:

- Hetzner Cloud (offer, prices, sign up): https://www.hetzner.com/cloud
- Hetzner Console (after signing in): https://console.hetzner.com/projects
- Creating a server: https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/
- Enabling backups: https://docs.hetzner.com/cloud/servers/getting-started/enabling-backups/
- Creating a firewall: https://docs.hetzner.com/cloud/firewalls/getting-started/creating-a-firewall/
- Logging in with an SSH key: https://community.hetzner.com/tutorials/add-ssh-key-to-your-hetzner-cloud/

Steps:

1. Create an account on https://www.hetzner.com/cloud and sign in to https://console.hetzner.com/projects.
2. Create a project, for example `ishelf`.
3. In the project, open **Servers** and choose **Add server**:
   - Location: **Nuremberg** or **Falkenstein** (Germany).
   - Image: **Ubuntu 24.04**.
   - Type: shared vCPU **CX23** (x86). If it cannot be ordered, **CAX11** (Arm) works too; all images used here run on both.
   - Networking: public IPv4 and IPv6.
   - SSH keys: **Add SSH key** and paste the content of `id_ed25519.pub`. The key cannot be added later in the console.
   - Backups: **on** (daily copies of the whole disk, seven are kept, about 20 % of the server price).
   - Name: `ishelf`.
   - Check the price shown at the bottom, then **Create & Buy now**.
4. Open **Firewalls**, create a firewall named `ishelf-web` with these inbound rules and apply it to the server:

   | Protocol | Port | Source |
   | --- | --- | --- |
   | TCP | 22 | Any IPv4, Any IPv6 |
   | TCP | 80 | Any IPv4, Any IPv6 |
   | TCP | 443 | Any IPv4, Any IPv6 |
   | UDP | 443 | Any IPv4, Any IPv6 |
   | ICMP | | Any IPv4, Any IPv6 |

   Everything else stays closed. The firewall runs outside the server, so it also covers the ports Docker opens.

5. Write down the server's IPv4 and IPv6 address.

## 4. DNS

In the registrar's DNS administration add:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` (the domain itself) | `<server-ipv4>` |
| AAAA | `@` | `<server-ipv6>` |

It can take from a few minutes to a few hours before the domain points to the server. Check it in PowerShell with `nslookup <domain>`. HTTPS will only work after that.

## 5. First login and securing the server

Log in as root (from PowerShell):

```
ssh root@<server-ip>
```

Update the system, create your own user and allow it to use `sudo` (choose a password when asked):

```
apt update && apt upgrade -y
```

```
adduser ishelf
```

```
usermod -aG sudo ishelf
```

```
rsync --archive --chown=ishelf:ishelf ~/.ssh /home/ishelf
```

Turn off password logins and root logins:

```
printf 'PermitRootLogin no\nPasswordAuthentication no\n' > /etc/ssh/sshd_config.d/99-ishelf.conf
```

```
systemctl restart ssh
```

**Before you close this window**, open a second PowerShell window and check that the new user can log in:

```
ssh ishelf@<server-ip>
```

From now on always log in as `ishelf`. Turn on automatic security updates:

```
sudo apt install -y unattended-upgrades
```

```
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Answer **Yes**.

## 6. Docker

Install Docker Engine from Docker's own repository exactly as described in the official guide (section "Install using the apt repository"): https://docs.docker.com/engine/install/ubuntu/

Then allow your user to run Docker without `sudo` (https://docs.docker.com/engine/install/linux-postinstall/):

```
sudo usermod -aG docker ishelf
```

Log out (`exit`) and log in again, then check:

```
docker run --rm hello-world
```

## 7. Code

If the repository is public:

```
git clone https://github.com/Andoryu07/iShelfandRecipes.git
```

If it is private, create a read-only deploy key on the server and add it to the repository (GitHub guide: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys):

```
ssh-keygen -t ed25519 -C "ishelf-server-deploy" -f ~/.ssh/github_deploy -N ""
```

```
cat ~/.ssh/github_deploy.pub
```

Paste the printed key into GitHub: repository **Settings → Deploy keys → Add deploy key**, leave **Allow write access** off. Then:

```
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n' >> ~/.ssh/config
```

```
git clone git@github.com:Andoryu07/iShelfandRecipes.git
```

## 8. Configuration (`.env`)

```
cd ~/iShelfandRecipes
```

```
cp .env.production.example .env
```

```
chmod 600 .env
```

Generate the passwords and put them into `.env` (`nano .env`, save with Ctrl+O, quit with Ctrl+X):

```
openssl rand -hex 24
```

for `POSTGRES_PASSWORD`, and

```
openssl rand -hex 32
```

for `JWT_SECRET`. Fill in also:

- `DOMAIN`: your domain without `https://`, for example `ishelf.cz`.
- `GEMINI_API_KEY`: the key from Google AI Studio.
- `VAPID_SUBJECT`: `mailto:` followed by your e-mail.

Generate the keys for push notifications and copy the two printed lines into `.env`:

```
docker compose -f docker-compose.production.yml run --rm --no-deps backend python -m application.notifications.generate_vapid_keys
```

Use new keys on the server, not the ones from your computer. If the VAPID keys ever change, every user has to switch notifications off and on again.

## 9. Start

```
deploy/deploy.sh
```

The first build takes a few minutes. Then check:

```
docker compose -f docker-compose.production.yml ps
```

All services should be `running`. Watch Caddy getting the certificate:

```
docker compose -f docker-compose.production.yml logs caddy
```

Open these addresses in the browser:

- `https://<domain>` shows the sign-in screen.
- `https://<domain>/api/health` shows `{"status":"ok"}`.
- `https://<domain>/api/docs` shows "Not Found" (the documentation is off in production).

Register, create a household, scan a receipt and switch on notifications in the household screen. On a phone, add the app to the home screen.

## 10. Backups and restoring

There are two kinds of backups:

- **Hetzner backups** of the whole server (daily, seven kept) are stored outside the server. Restore one in the console: server → **Backups**.
- **Database backups** every night at 3:00 in `~/iShelfandRecipes/backups` (`ishelf-YYYY-MM-DD.dump`), the last 14 days are kept.

List them:

```
ls -lh ~/iShelfandRecipes/backups
```

Copy them to your computer from time to time (run in PowerShell on your computer):

```
scp ishelf@<server-ip>:~/iShelfandRecipes/backups/*.dump .
```

### Test of a restore (do it once after the start)

1. In the app, create a test household or add a food.
2. Make a backup right now:

   ```
   docker compose -f docker-compose.production.yml exec backup sh -c 'pg_dump --format=custom --file=/backups/ishelf-test.dump'
   ```

3. In the app, delete the food or leave the test household.
4. Restore the backup (the app stops for a moment):

   ```
   deploy/restore.sh backups/ishelf-test.dump
   ```

5. Reload the app: the food or household is back.
6. Delete the test backup: `rm backups/ishelf-test.dump`

## 11. Monitoring

UptimeRobot checks every 5 minutes that the app answers and sends an e-mail when it does not (the free plan is enough).

- Website: https://uptimerobot.com/
- Guide: https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide

Create a free account, add a monitor of type **HTTP(s)** with the address `https://<domain>/api/health`, interval 5 minutes, and your e-mail as the alert contact.

Logs of each service (the last lines, `-f` follows new ones):

```
docker compose -f docker-compose.production.yml logs --tail 100 -f backend
```

Logs are limited to 30 MB per service so they cannot fill the disk.

## 12. New versions

After new commits on `main`, log in and run:

```
cd ~/iShelfandRecipes && deploy/deploy.sh
```

It pulls the code, rebuilds the images, restarts what changed (migrations run on start) and removes old images.

## Troubleshooting

- **The browser says the connection is not secure or the site does not load:** the domain does not point to the server yet (step 4) or ports 80 and 443 are closed (step 3). See `docker compose -f docker-compose.production.yml logs caddy`. Caddy tries again on its own.
- **A service keeps restarting:** see its log, for example `docker compose -f docker-compose.production.yml logs backend`, and send it to Claude.
- **Receipts cannot be read:** check `GEMINI_API_KEY` in `.env` and run `deploy/deploy.sh` again.
- **Notifications do not arrive:** check the VAPID keys in `.env` and run the daily jobs by hand:

  ```
  docker compose -f docker-compose.production.yml exec worker python -m application.jobs.run_daily_jobs --force
  ```
