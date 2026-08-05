# Ticket Zick

A multi-server Discord ticketing system with a fully customisable web dashboard.

## Structure

- `bot/` — Discord bot (discord.js v14). Handles ticket panels, ticket channel creation, claiming, closing, transcripts.
- `server/` — Backend API (Express + Prisma + SQLite). Stores guild config, ticket panels, branding, tickets. Handles Discord OAuth2 login for the dashboard.
- `dashboard/` — Web dashboard (React + Vite + Tailwind). Login with Discord, pick a server, build ticket panels, customise branding, view/manage tickets.

## How it fits together

```
Discord Server ⇄ Bot (discord.js) ⇄ Server API (Express/Prisma) ⇄ Dashboard (React)
```

The bot and dashboard never talk to each other directly — they both go through the `server` API, which is the single source of truth (SQLite DB). This means changes made in the dashboard (panel text, colours, categories, staff roles) take effect on the bot immediately, no bot restart needed.

## Deploying on Render

This repo includes a `render.yaml` Blueprint, so Render can create all three services (server, bot, dashboard) plus a Postgres database automatically. See the step-by-step chat walkthrough for the full process — short version:

1. Push this folder to a GitHub repo.
2. Render dashboard → New → Blueprint → pick your repo → Render reads `render.yaml` and proposes 3 services + 1 database.
3. Fill in the secret env vars it asks for (Discord client id/secret/bot token, redirect URI, dashboard URL) — these come from the Discord Developer Portal, see below.
4. Deploy. Once the server and dashboard have URLs, go back and update `DISCORD_REDIRECT_URI`, `DASHBOARD_URL`, `VITE_API_URL`, `VITE_DISCORD_REDIRECT_URI` to the real Render URLs, then redeploy those two services.

## Local Setup

### 1. Discord Application

1. Go to https://discord.com/developers/applications → New Application → name it "Ticket Zick".
2. **Bot tab**: click "Add Bot", copy the token → this is `DISCORD_BOT_TOKEN`.
   - Enable **Server Members Intent** and **Message Content Intent**.
3. **OAuth2 tab**: copy Client ID and Client Secret → `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.
   - Add redirect URL: `http://localhost:4000/auth/discord/callback`
4. **OAuth2 → URL Generator**: scopes `bot applications.commands`, permissions: Manage Channels, Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History, View Channels. Use the generated URL to invite the bot to your test server.

### 2. Backend (`server/`)

```bash
cd server
cp .env.example .env   # fill in the values
npm install
npx prisma migrate dev --name init
npm run dev             # runs on http://localhost:4000
```

### 3. Bot (`bot/`)

```bash
cd bot
cp .env.example .env   # fill in DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, API_URL
npm install
npm run deploy-commands  # registers slash commands
npm run dev
```

### 4. Dashboard (`dashboard/`)

```bash
cd dashboard
cp .env.example .env   # fill in VITE_API_URL and VITE_DISCORD_CLIENT_ID
npm install
npm run dev              # runs on http://localhost:5173
```

Open the dashboard, log in with Discord, pick your server, and build your first ticket panel — it'll instantly be usable in Discord via `/panel-send` or by the bot auto-posting it.

## Core features included

- **Multi-server**: every guild gets its own isolated config (panels, categories, staff roles, branding, tickets) keyed by `guildId`.
- **Fully customisable panels**: title, description, embed colour, button label/emoji, thumbnail/image, ticket category, welcome message, which roles can see tickets, naming pattern, max open tickets per user.
- **Bot behaviour**: `/panel-send`, button-based ticket creation, claim/unclaim, add/remove user, close with transcript, auto-generated ticket numbers.
- **Dashboard**: Discord OAuth2 login, guild switcher, live panel builder with preview, branding (dashboard logo/colours per server), ticket list + transcript viewer, staff role management.

## Extending it

- Swap SQLite → Postgres: change `provider` in `server/prisma/schema.prisma` and `DATABASE_URL`.
- Add ticket categories/departments: the schema already supports multiple `Panel`s per guild, each with its own category/roles — add more panels in the dashboard.
- Add transcripts to S3: `bot/src/utils/transcript.js` currently saves HTML transcripts to `server`'s `/uploads` — swap that call for your storage of choice.
