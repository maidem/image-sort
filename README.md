# Image Sort

Bildergalerie-App zum Verwalten und Präsentieren von Original- und Gemälde-Fotopaarungen.  
Ein Admin lädt je ein Original-Foto und ein gemaltes Pendant hoch. Im öffentlichen Frontend sieht man ausschließlich die Gemälde in einer anklickbaren Galerie. Über eine Lightbox lassen sich die Bilder groß ansehen und durchwischen.

---

## Funktionen im Überblick

### Öffentliche Galerie (`/`)

- **Bildergalerie** — zeigt alle Gemälde-Fotos als responsives Grid (2 / 3 / 4 Spalten je nach Bildschirmbreite)
- **Kategorie-Filter** — Buttons über dem Grid; Klick filtert die Galerie ohne Seitenneuladen; Reihenfolge folgt der vom Admin definierten Sortierung
- **Datum unter dem Bild** — „Gemalt am"-Datum wird unter jedem Thumbnail angezeigt
- **Lightbox** — Klick auf ein Bild öffnet es groß als Vollbild-Overlay:
  - Navigation per **Pfeiltasten** (← →), **Mausklick** auf Pfeil-Buttons oder **Wischen / Maus-Drag** (ab 50 px Bewegung)
  - **ESC** schließt die Lightbox; Klick auf den Hintergrund ebenfalls
  - **Mausrad-Zoom** von 1× bis 3×
  - Bildunterschrift (Beschreibung + Datum + Seitenzähler „3 / 12") am unteren Rand
  - Desktop: Tastatur-Hinweise eingeblendet; Mobile: Swipe-Hinweis
- **Responsive** — vollständig mobiloptimiert, sticky Header mit Hamburger-Menü auf kleinen Bildschirmen

---

### Admin-Bereich (`/login` → `/admin/*`)

#### Login (`/login`)

- E-Mail + Passwort-Formular
- Redirect nach erfolgreichem Login zurück zur ursprünglich aufgerufenen Seite
- Hinweis-Banner wenn `ADMIN_PASSWORD` / `SESSION_SECRET` nicht gesetzt sind

#### Kategorien verwalten (`/admin/categories`)

- **Liste aller Kategorien** mit Name, Beschreibung und Bildpaar-Zähler
- **Neue Kategorie anlegen** — Name (Pflicht) + optionale Beschreibung
- **Kategorie bearbeiten** — Name und Beschreibung ändern
- **Kategorie löschen** — löscht auch alle zugehörigen Bildpaare und Dateien (CASCADE)
- **Reihenfolge per Drag & Drop** — Kategorien per Griff-Handle verschieben; Reihenfolge wird sofort in der DB gespeichert; diese Reihenfolge gilt auch für den Galerie-Filter

#### Bildpaare verwalten (`/admin/images`) — 3-Ebenen-Navigation

**Ebene 1 — Kategorie-Übersicht**

- Alle Kategorien als Karten mit:
  - Kategoriename + Bildpaar-Zähler
  - Optionaler Kategoriebeschreibung
  - 4er-Mini-Vorschau (erste 4 Original-Fotos der Kategorie) + Platzhalter-Boxen wenn weniger vorhanden
- Klick auf eine Karte öffnet Ebene 2

**Ebene 2 — Bildpaare einer Kategorie**

- Kachel-Raster (2 / 3 / 4 Spalten) mit je einer Kachel pro Paar:
  - Doppel-Thumbnail: Original (links) + Gemälde (rechts) nebeneinander
  - Beschreibung oder Datum als Label darunter; falls beides fehlt: `#ID`
  - Hover-Effekt (Schatten + pinker Rahmen)
- Klick auf eine Kachel öffnet Ebene 3
- **„+ Bildpaar hochladen"**-Button öffnet Formular in derselben Ansicht:
  - Kategorie-Auswahl (vorausgefüllt mit aktueller Kategorie), Datum, Beschreibung
  - Original-Foto + Gemälde-Foto: nach Auswahl sofort als Vorschau mit **„✏️ Zuschneiden"** und **„Entfernen"** Buttons

**Ebene 3 — Einzelnes Bildpaar bearbeiten**

- Breadcrumb-Navigation zurück zu Kategorie / Übersicht
- **Metadaten** bearbeiten: Kategorie wechseln, Datum, Beschreibung → „Metadaten speichern"
- **Original** und **Gemälde** jeweils in einer 4:3-Box (object-contain, volles Bild sichtbar):
  - **✏️ Zuschneiden** — öffnet den eingebauten Crop-Editor (s. u.)
  - **↺ Ersetzen** — Datei-Dialog, Foto direkt tauschen ohne Seitenneuladen
  - **Löschen** — entfernt nur dieses eine Foto (Slot bleibt leer mit „Hochladen"-Button)
  - Bei leerem Slot: **„📁 Hochladen"**-Button
- **Paar löschen** — löscht Paar + beide Dateien, navigiert zurück zur Kategorie

#### Eingebauter Crop-Editor

Wird als Modal über der Seite angezeigt (via Teleport) — kein Seitenwechsel:

- Basiert auf `vue-advanced-cropper`
- **Freies Zuschneiden** mit verschiebbarem und skalierbarem Auswahlrahmen + Grid-Overlay
- **Steuerbuttons:** Zoom in / Zoom out, Rotate links (−90°), Rotate rechts (+90°), Spiegeln horizontal (↔), Spiegeln vertikal (↕), Reset
- **„Zuschnitt speichern"** exportiert den Canvas als PNG-Blob und:
  - Bei neuen Uploads: ersetzt die Vorschau-Datei im Upload-Formular
  - Bei bestehenden Bildpaaren: sendet den Blob direkt per `POST /api/image-pairs/:id/original` oder `/painted` an den Server → Bild wird sofort gespeichert und die Ansicht aktualisiert

---

## Tech-Stack

| Bereich              | Technologie                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| Framework            | **Nuxt 4** (Vue 3.5 + Nitro), TypeScript                                |
| Datenbank lokal      | **SQLite** via `better-sqlite3` — kein Setup, WAL-Modus, Foreign Keys   |
| Datenbank Produktion | **PostgreSQL 16** via `postgres.js` (pure JS, kein nativer Build nötig) |
| Datenbank-Adapter    | Hybrid: automatische Erkennung via `DATABASE_URL`                       |
| CSS                  | **Tailwind CSS v4** — Pink/Ink Farbschema                               |
| Bilder-Cropper       | `vue-advanced-cropper`                                                  |
| Drag & Drop          | `sortablejs`                                                            |
| Composables          | `@vueuse/core` (`useEventListener`)                                     |
| Auth                 | HMAC-SHA256 signierte Session-Cookies (12 h TTL)                        |
| Datei-Uploads        | gespeichert unter `./data/uploads`, serviert via `/api/uploads/[path]`  |
| Container            | Multi-Stage Dockerfile (Node 22 Alpine)                                 |
| Deployment           | **Coolify**                                                             |

---

## Lokal entwickeln

**Voraussetzungen:** Node 22 (empfohlen via [Volta](https://volta.sh)), npm

```bash
npm install
cp .env.example .env    # Werte anpassen
npm run dev
```

- App: http://localhost:3000
- Admin-Login: http://localhost:3000/login

Lokal wird automatisch **SQLite** verwendet — keine Datenbank-Installation nötig.  
Die Datei liegt unter `./data/app.db`, Bilder unter `./data/uploads/`.

---

## Umgebungsvariablen

| Variable            | Standard         | Beschreibung                                                            |
| ------------------- | ---------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`      | _(leer)_         | PostgreSQL-Connection-URL. Gesetzt → PostgreSQL; nicht gesetzt → SQLite |
| `DATABASE_PATH`     | `./data/app.db`  | SQLite-Pfad (nur ohne `DATABASE_URL` relevant)                          |
| `UPLOAD_PATH`       | `./data/uploads` | Verzeichnis für hochgeladene Bilder                                     |
| `ADMIN_EMAIL`       | _(leer)_         | Admin-Login-E-Mail (leer = jede E-Mail akzeptiert)                      |
| `ADMIN_PASSWORD`    | _(leer)_         | Admin-Passwort (leer = Admin-Endpunkte deaktiviert!)                    |
| `SESSION_SECRET`    | _(leer)_         | Zufälliger HMAC-Schlüssel, mind. 32 Zeichen                             |
| `NODE_ENV`          | _(ungesetzt)_    | `production` → `Secure`-Flag auf Session-Cookie                         |
| `NITRO_PORT`        | `3000`           | HTTP-Port                                                               |
| `NITRO_HOST`        | `0.0.0.0`        | Bind-Adresse (wichtig für Docker)                                       |
| `POSTGRES_PASSWORD` | _(leer)_         | Passwort für `db`-Service in docker-compose                             |

---

## Sicherheit

- **Session-Cookies:** HMAC-SHA256, 12 h TTL, `httpOnly`, `sameSite=lax`, `secure` in Produktion
- **Timing-safe Vergleiche:** `timingSafeEqual` für Passwort- und Signatur-Prüfung
- **Datei-Uploads:** Whitelist `image/jpeg, image/png, image/webp, image/gif`; Dateinamen sind zufällige UUIDs
- **Path-Traversal:** Dateinamen beim Serving auf `[a-zA-Z0-9._-]` bereinigt + `startsWith`-Prüfung
- **Alle schreibenden API-Endpunkte** erfordern gültige Admin-Session (HTTP 401 sonst)
- **OWASP-konform:** keine SQL-Injection möglich (parametrisierte Queries in beiden Adaptern)

---

## Datenmodell

```
categories
  id          INTEGER / SERIAL  PK
  name        TEXT              UNIQUE NOT NULL
  description TEXT
  sort_order  INTEGER           DEFAULT 0
  created_at  TEXT / TIMESTAMPTZ

image_pairs
  id                INTEGER / SERIAL  PK
  category_id       INTEGER           FK → categories(id) ON DELETE CASCADE
  original_filename TEXT              (UUID-Dateiname oder NULL)
  painted_filename  TEXT              (UUID-Dateiname oder NULL)
  description       TEXT
  painted_at        TEXT              (Datum als String, z. B. "2026-03-15")
  created_at        TEXT / TIMESTAMPTZ
```

---

## Projektstruktur

```
app/
  assets/css/main.css        ← Tailwind v4 + eigene Utilities (btn-*, card, input, …)
  layouts/default.vue        ← Sticky Header, Hamburger-Menü, Login/Logout
  middleware/admin.ts        ← Schützt /admin/* Routen (redirect zu /login)
  composables/useAuth.ts     ← Login, Logout, isAdmin-State
  pages/
    index.vue                ← Öffentliche Galerie + Lightbox
    login.vue                ← Admin-Login-Formular
    admin/
      images.vue             ← Bildpaare (Übersicht → Kategorie → Paar bearbeiten)
      categories.vue         ← Kategorien + Drag-&-Drop-Sortierung
  components/
    ImageCropper.vue         ← Crop-Modal (vue-advanced-cropper)
    LightboxViewer.vue       ← Vollbild-Lightbox (Swipe, Tastatur, Zoom)

server/
  plugins/db.ts              ← Nitro-Plugin: führt Migrationen beim Start aus
  utils/
    db.ts                    ← Hybrid-DB-Adapter (SQLite ↔ PostgreSQL)
    auth.ts                  ← Session-Cookie: encode, decode, requireAdmin
  api/
    categories/
      index.get.ts           ← GET  /api/categories (mit image_count)
      index.post.ts          ← POST /api/categories
      [id].patch.ts          ← PATCH /api/categories/:id
      [id].delete.ts         ← DELETE /api/categories/:id (+ Datei-Cleanup)
      reorder.post.ts        ← POST /api/categories/reorder (sort_order-Update)
    image-pairs/
      index.get.ts           ← GET  /api/image-pairs (?category_id=…)
      index.post.ts          ← POST /api/image-pairs (multipart)
      [id].patch.ts          ← PATCH /api/image-pairs/:id
      [id].delete.ts         ← DELETE /api/image-pairs/:id (+ Datei-Cleanup)
      [id]/
        original.post.ts     ← POST /api/image-pairs/:id/original (Bild ersetzen)
        original.delete.ts   ← DELETE … (nur Original löschen)
        painted.post.ts      ← POST /api/image-pairs/:id/painted
        painted.delete.ts    ← DELETE …
    uploads/[...path].get.ts ← Statisches Serving mit Cache-Control + MIME

types/models.ts              ← Shared TypeScript-Typen (Category, ImagePair)
Dockerfile                   ← Multi-Stage: Build (Node 22) + schlankes Runtime-Image
docker-compose.yml           ← App + PostgreSQL 16 für lokales Docker-Testing
```

---

## Deployment auf Coolify mit Tailscale

> Coolify und Tailscale laufen bereits auf dem Server.

### 🔄 Automatisches Image-Building mit GitHub Actions

Dieses Projekt nutzt **GitHub Actions** CI/CD, um automatisch:

1. Bei jedem `git push origin main` ein Docker-Image zu bauen
2. Das Image in die **GitHub Container Registry (GHCR)** `ghcr.io/maidem/image-sort` zu pushen
3. Verschiedene Tags zu erstellen: `main` (aktuellster), `latest`, Semantic Versioning, Git-SHA

**Workflowdatei:** `.github/workflows/deploy.yml` — bereits konfiguriert.  
**Erforderlich:** GitHub Token (automatisch via `GITHUB_TOKEN` — keine zusätzliche Konfiguration nötig).

---

### 1 — PostgreSQL-Datenbank anlegen

1. Coolify → **Databases** → **New Database** → **PostgreSQL 16**
2. Name: z. B. `image-sort-db`
3. Speichern — Coolify zeigt danach die **Internal Connection URL**, z. B.:  
   `postgresql://postgres:XXXXXXXX@image-sort-db:5432/postgres`
4. Diese URL für Schritt 3 notieren.

### 2 — App-Service von GHCR Image anlegen

1. Coolify → **Projects** → Projekt wählen → **New Resource** → **Docker Image**
2. **Image Name:** `ghcr.io/maidem/image-sort:main`
3. **Build Pack:** `Docker Image` (Coolify lädt das fertige Image von GHCR, baut nicht mehr lokal)
4. **Port:** `3000`
5. Optional: **Authentication** — falls das Repository privat sein sollte, benötigst du einen GitHub Personal Access Token mit `read:packages`-Scope

### 3 — Umgebungsvariablen setzen

```env
DATABASE_URL=postgresql://postgres:XXXXXXXX@image-sort-db:5432/postgres
UPLOAD_PATH=/data/uploads
ADMIN_EMAIL=deine@email.de
ADMIN_PASSWORD=sicheresPasswort
SESSION_SECRET=<openssl rand -hex 32>
NODE_ENV=production
```

Paste die Werte direkt in Coolify UI unter **Environment Variables**.

### 4 — Persistentes Volume für Bilder

Im Tab **Storages / Volumes** des App-Services:

→ **Add Volume** →

- **Source Path:** `/srv/image-sort/uploads` (absoluter Pfad auf dem Server — Coolify erstellt das Verzeichnis automatisch)
- **Destination Path:** `/data/uploads` (Pfad im Container)

> Ohne dieses Volume gehen alle hochgeladenen Bilder bei jedem Re-Deploy verloren!

### 5 — Tailscale-Erreichbarkeit

**Option A — Nur intern (nur Tailnetz, kein öffentlicher Zugang):**  
Coolify → App → Domain: MagicDNS-Hostname des Servers eintragen, z. B.  
`http://mein-server.tail1234.ts.net:3000`  
→ App ist nur für Geräte im Tailnetz erreichbar.

**Option B — Öffentliche Galerie + geschützter Admin:**

1. Öffentliche Domain in Coolify eintragen → Coolify erstellt automatisch Let's-Encrypt-Zertifikat
2. Admin-Zugang nur über Tailscale-IP / MagicDNS direkt am Port 3000 (kein Reverse-Proxy dazwischen)

### 6 — Erster Deploy

1. Coolify → App-Service → **Deploy**
2. Coolify lädt das Image von ghcr.io herunter und startet es (~1–2 min)
3. Beim ersten Start werden Datenbank-Tabellen und Indizes automatisch angelegt

### 7 — Updates & Re-Deploys

**Automatische Deployments (optional via Webhook):**

1. Coolify → App → **Webhooks** → URL kopieren
2. GitHub → Repository → **Settings** → **Webhooks** → neuen Webhook hinzufügen:
   - Payload URL: kopierte Coolify-Webhook-URL
   - Content type: `application/json`
   - Event: **Just the push event**
3. Workflow: `git push origin main` → GitHub Actions baut & pushed zu GHCR → Coolify deployt automatisch

**Oder manuell:**

- Code pushen → GitHub Actions baut automatisch zu GHCR
- In Coolify: **Re-deploy** triggern, um das neue Image zu pullen
- Oder Image-Tag wechseln (z. B. von `main-abc123` zu `main` = latest)
