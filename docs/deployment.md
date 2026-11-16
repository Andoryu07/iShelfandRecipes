# Deployment

This guide puts iShelf and Recipes on a WEDOS virtual server in the Czech Republic (EU, as the privacy policy says) with its own `.cz` domain and HTTPS. Every command is meant to be copied as it is; replace only the values in angle brackets, for example `<server-ip>`.

Production uses `docker-compose.production.yml`:

| Service | What it does |
| --- | --- |
| `caddy` | Serves the built PWA, forwards `/api` to the backend and gets and renews the HTTPS certificate automatically (Let's Encrypt) |
| `backend` | The API (`BACKEND_WORKERS` processes, 1 by default); database migrations run on start; `/docs` is turned off |
| `worker` | Scheduled jobs every full hour (push notifications at each member's chosen hour, deleting accounts after the 14-day period) |
| `database` | PostgreSQL, not reachable from the internet |
| `backup` | A database backup every night at 3:00 into `backups/`, the last 14 days are kept |

Costs: WEDOS VPS SSD with 1 module (1 CPU, 2 GB RAM, 15 GB SSD) and an IPv4 address, 147 CZK a month without VAT; with 21 % VAT about 178 CZK a month on yearly billing or about 196 CZK on monthly billing (+10 %). No paid extras (backups, firewall) are needed. The domain costs about 200 CZK for the first year. The financial plan counts with 200 CZK a month for the server.

## 1. Domain

1. Check that the name is free in the official registry search of CZ.NIC: https://www.nic.cz/whois/ (type the name with `.cz`, without `www`).
2. Register it with an accredited registrar. The simplest is to buy it at WEDOS too, in the same customer account as the server, because then the DNS records are set in the same administration (step 4). Any other registrar works as well; CZ.NIC explains the process: https://www.nic.cz/page/313/

## 2. SSH key (on your Windows computer)

Open PowerShell and run:

```
ssh-keygen -t ed25519 -C "ishelf-server"
```

Press Enter to keep the default location and choose a passphrase. The public key is in `C:\Users\<you>\.ssh\id_ed25519.pub`; you will copy it to the server in step 5. Never share the file without `.pub`.

## 3. WEDOS virtual server

Official pages:

- VPS SSD offer and prices: https://wedos.cz/en/vps-ssd/
- Increasing the parameters later (more modules): https://kb.vedos.cz/en/vps-ssd-parametry/

Order (already done):

- Configuration: **15 GB HDD 100% SSD, RAID 10, 2 GB RAM, 1 proc.** (1 module).
- Operating system: **Ubuntu Server 24.04**.
- Additional services: only **IPv4 address**. Backups, firewall and the other extras are not needed: the app backs up its database every night and the firewall is set up on the server for free (step 5).

After the order is paid and set up, WEDOS sends an e-mail that the server is ready, and the login details. Write down the server's **IPv4 address** and the **root password**.

The set-up e-mail can arrive with unfilled placeholders such as `{server: ip}` instead of the addresses. The IPv4 address is then in the WEDOS customer administration: **Serverové služby → VPS SSD/HDD →** your server **→ Technické parametry**. If the root password is missing too, ask WEDOS support to resend the set-up e-mail; do not change the password before you have it, WEDOS cannot recover a changed one.

The server also gets an IPv6 range (shown as an address ending in `X`, for example `2a02:2b88:2:1::7e10:X / 64`). It cannot be used before a specific address is enabled in the administration and configured on the server, so this guide uses only IPv4; IPv6 can be added later.

## 4. DNS

The domain has to point to the server's IPv4 address; HTTPS only works after that. You need the domain from step 1 and the IP address from step 3.

**Domain at WEDOS** (WEDOS guides: https://kb.wedos.com/cs/dns/wedos-dns/wedos-dns-zaznamy-domeny/ and https://kb.vedos.cz/dns-a-aaaa/):

1. Sign in to the WEDOS customer administration and open **DNS**.
2. Select the domain and choose **DNS záznamy** in the left menu.
3. If there already is an A record with an empty name (for example pointing to WEDOS web hosting), edit it instead of adding a second one; two A records for the same name would send visitors randomly to either address.
4. Add a new record (or edit the existing one):

   | Field | Value |
   | --- | --- |
   | Name | leave empty (the domain itself, do not type `@`) |
   | TTL | 300 |
   | Type | A |
   | Data | `<server-ipv4>` |

5. Add the same record with the name `www` (or edit the existing `www` record), so `www.<domain>` points to the server too; Caddy redirects it to `https://<domain>`.
6. Remove records the app does not use (for example `ftp`) and all **AAAA** records unless you have set up the server's IPv6 address; an AAAA record pointing elsewhere (for example to a parking page) stops the HTTPS certificate from being issued.
7. Save. WEDOS applies DNS changes within about an hour.

**Domain at another registrar** (for example czechia.com): set the same records in its DNS administration (there the empty name is often written as `@`): A `@` and A `www` to `<server-ipv4>`, remove `ftp` and all AAAA records that point to the registrar's parking page. If the domain is in a "parking" mode, switch it to plain DNS if the records keep changing back. DNS records at WEDOS have no effect if the domain uses another provider's name servers, and the other way round, so edit the records where the domain's DNS is actually run.

Check it in PowerShell on your computer:

```
nslookup <domain>
```

When the answer shows the server's IP address, the domain points to the server.

## 5. First login and securing the server

Log in as root with the password from WEDOS (from PowerShell):

```
ssh root@<server-ip>
```

Answer `yes` to the question about the server's fingerprint. Update the system and create your own user (choose a password when asked):

```
apt update && apt upgrade -y
```

```
adduser ishelf
```

```
usermod -aG sudo ishelf
```

Copy your SSH key to the new user. Run this in a **second PowerShell window on your computer** (it asks for the password of `ishelf`):

```
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh ishelf@<server-ip> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

Check in that second window that the key login works without the server password (only the passphrase of your key):

```
ssh ishelf@<server-ip>
```

Only when it works, turn off password logins and root logins (in the first window, still as root):

```
printf 'PermitRootLogin no\nPasswordAuthentication no\n' > /etc/ssh/sshd_config.d/99-ishelf.conf
```

```
systemctl restart ssh
```

From now on always log in as `ishelf` and use `sudo` for administration.

Turn on the firewall: only SSH, HTTP and HTTPS stay open.

```
sudo ufw allow OpenSSH
```

```
sudo ufw allow 80/tcp
```

```
sudo ufw allow 443/tcp
```

```
sudo ufw allow 443/udp
```

```
sudo ufw enable
```

Answer `y`. Check with `sudo ufw status`. Ports that Docker publishes bypass `ufw`; in production only Caddy publishes ports (80 and 443), the database and the backend are reachable only inside Docker.

Turn on automatic security updates:

```
sudo apt install -y unattended-upgrades
```

```
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Answer **Yes**.

Add 2 GB of swap, so building the app on the server cannot run out of memory with 2 GB RAM:

```
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

```
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Check with `free -h`: the line `Swap` shows 2.0Gi.

## 6. Docker

These commands follow Docker's official guide "Install Docker Engine on Ubuntu", section "Install using the apt repository" (https://docs.docker.com/engine/install/ubuntu/). They add Docker's own package source and install Docker from it; run them as `ishelf` from any directory (the home directory is fine). If the official guide differs, follow the guide.

```
sudo apt-get install -y ca-certificates curl
```

```
sudo install -m 0755 -d /etc/apt/keyrings
```

```
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
```

```
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

```
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

```
sudo apt-get update
```

```
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Allow your user to run Docker without `sudo` (https://docs.docker.com/engine/install/linux-postinstall/):

```
sudo usermod -aG docker ishelf
```

Log out (`exit`) and log in again, then check:

```
docker run --rm hello-world
```

## 7. Code

The repository is public:

```
git clone https://github.com/Andoryu07/iShelfandRecipes.git
```

If it ever becomes private, create a read-only deploy key on the server and add it to the repository (GitHub guide: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys):

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
- `PREMIUM_TEST_ACTIVATION`: `true` lets every user switch on 30 days of premium for free in Profil → Premium (for testers and the project defence; set `false` once real payments exist). Plan limits are in `backend/application/plans.py`.
- `ADS_ENABLED`: `true` (default) shows the ad placeholders and rewarded ads to guests and free users; `false` hides them for everyone.
- `VAPID_SUBJECT`: `mailto:` followed by your e-mail.
- `BACKEND_WORKERS`: keep `1` on this server (2 GB RAM); it is plenty for testing. With more memory you can use `2`.

Generate the keys for push notifications and copy the two printed lines into `.env`:

```
docker compose -f docker-compose.production.yml run --rm --no-deps backend python -m application.notifications.generate_vapid_keys
```

Use new keys on the server, not the ones from your computer. If the VAPID keys ever change, every user has to switch notifications off and on again.

## 9. Start

```
deploy/deploy.sh
```

The first build takes about five minutes on one CPU. The output ends with a list of the removed build cache and the running services. Then check:

```
docker compose -f docker-compose.production.yml ps
```

All five services should be `Up` (the database also `healthy`). Watch Caddy getting the certificates; the log should end with `certificate obtained successfully` for the domain and for `www`:

```
docker compose -f docker-compose.production.yml logs caddy
```

Open these addresses in the browser:

- `https://<domain>` shows the sign-in screen.
- `https://www.<domain>` redirects to `https://<domain>`.
- `https://<domain>/api/health` shows `{"status":"ok"}`.
- `https://<domain>/api/docs` shows "Not Found" (the documentation is off in production).

Register, create a household, scan a receipt and switch on notifications in the household screen. On a phone, add the app to the home screen.

## 10. Backups and restoring

There are two kinds of backups:

The server has no paid WEDOS backups, so the app's own backups are the only ones:

- **Database backups** every night at 3:00 in `~/iShelfandRecipes/backups` (`ishelf-YYYY-MM-DD.dump`), the last 14 days are kept.
- **Your copy:** because these files live on the same server, copy them to your computer **once a week** (below). If the server is ever lost, the app can be set up again from this guide and the database restored from your copy.

List them:

```
ls -lh ~/iShelfandRecipes/backups
```

Copy them to your computer once a week (run in PowerShell on your computer, in the folder where you keep them):

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
6. Delete the test backup (backup files belong to `root` because the backup container writes them, so `sudo` is needed):

   ```
   sudo rm backups/ishelf-test.dump
   ```

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

WEDOS server status, payments and the root password reset are in the WEDOS customer administration.

## 12. New versions

After new commits on `main`, log in and run:

```
cd ~/iShelfandRecipes && deploy/deploy.sh
```

It pulls the code, rebuilds the images, restarts what changed (migrations run on start) and removes old images and the build cache, so the 15 GB disk does not fill up. Check the free space now and then with `df -h /`.

## 13. E-mails (Brevo)

The app sends e-mails for password reset, after a password change and when someone asks to delete their account. Without SMTP settings it only writes them to the backend log.

1. Create a free account at brevo.com (300 e-mails a day, no card).
2. In Brevo open Senders, Domains & Dedicated IPs → Domains → Add a domain, enter `ishelf.cz` and choose to set up the records yourself.
3. In the DNS at czechia.com add every record Brevo shows: the `brevo-code` TXT record, the DKIM records and the DMARC record (`_dmarc`, start with `v=DMARC1; p=none`). For SPF there may be only one TXT record starting with `v=spf1` on the domain; if Brevo asks for one, use `v=spf1 include:spf.brevo.com ~all`. Then press Verify in Brevo (DNS changes can take up to a few hours).
4. Add the sender `noreply@ishelf.cz` (Senders). The address does not need a mailbox.
5. In SMTP & API → SMTP create an SMTP key. Put into `.env` on the server:

   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USERNAME=<the login shown on the SMTP page>
   SMTP_PASSWORD=<the SMTP key>
   EMAIL_FROM=iShelf <noreply@ishelf.cz>
   EMAIL_REPLY_TO=<your e-mail, or leave empty>
   ```

6. Run `deploy/deploy.sh`, open https://ishelf.cz/forgot-password, enter your own e-mail and check that the e-mail arrives (also in spam) and the link works.

## Troubleshooting

- **The browser says the connection is not secure or the site does not load:** the domain does not point to the server yet (step 4) or ports 80 and 443 are closed (check `sudo ufw status`, step 5). See `docker compose -f docker-compose.production.yml logs caddy`. Caddy tries again on its own.
- **The build stops with "Killed" or the server becomes very slow:** check that the swap is on (`free -h`, step 5).
- **No space left on the disk:** run `docker system prune -f` and delete old backups you have already copied to your computer.
- **A service keeps restarting:** see its log, for example `docker compose -f docker-compose.production.yml logs backend`, and send it to Claude.
- **Receipts or recipes cannot be read:** check `GEMINI_API_KEY` in `.env` and run `deploy/deploy.sh` again.
- **E-mails do not arrive:** see `docker compose -f docker-compose.production.yml logs backend | grep -i e-mail`. Check the SMTP values in `.env` and that the domain is verified in Brevo. If the connection times out, try `SMTP_PORT=2525`.
- **Notifications do not arrive:** check the VAPID keys in `.env` and run the daily jobs by hand:

  ```
  docker compose -f docker-compose.production.yml exec worker python -m application.jobs.run_daily_jobs --force
  ```
