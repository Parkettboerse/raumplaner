# Parkettbörse Raumplaner

KI-gestützte Bodenvisualisierung für parkettboerse.net

Laden Sie ein Foto Ihres Raumes hoch, wählen Sie einen Bodenbelag aus dem Sortiment der Parkettbörse Augsburg und sehen Sie in Sekunden eine realistische Vorschau — powered by OpenAI GPT Image.

## Setup

1. `npm install`
2. `.env.local` anlegen (siehe `.env.example`)
3. `npm run dev`

## Deployment auf Vercel

1. Git-Repo erstellen und pushen
2. Auf vercel.com neues Projekt anlegen und Repo verbinden
3. Environment Variables eintragen: `OPENAI_API_KEY`, `ADMIN_PASSWORD`, `BLOB_READ_WRITE_TOKEN`
4. Vercel Blob Storage im Dashboard aktivieren
5. Deployen

## Admin-Panel

Erreichbar unter `/admin` mit dem gesetzten `ADMIN_PASSWORD`.
Dort können Produkte verwaltet, CSV importiert und Texturbilder hochgeladen werden.

## Produkte pflegen

1. Im IONOS-Shop Produkte als CSV exportieren
2. Im Admin-Panel unter `/admin` die CSV importieren (Spalten: Name, Kategorie, Detail, Preis, Shop-URL)
3. Pro Produkt ein Texturbild hochladen (mind. 512x512px, reine Bodentextur)
