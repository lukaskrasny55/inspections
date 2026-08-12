# Inspections Starter

Holá kópia zdrojového kódu appky TMS-HYDRA "Obhliadky" (bez git histórie, bez dát,
bez pripojenej databázy). Slúži ako východisková kostra pre budúci samostatný
produkt na obhliadky striech (ploché aj iné typy).

Vytiahnuté z posledného commitu vetvy `feature/obhliadky-app` repozitára
`tmshydra.com` (2026-08-10).

## Stav

- Kód appky (React 19 + Vite + TypeScript, Prisma + PostgreSQL) je kompletný a
  identický s produkčnou appkou TMS-HYDRA v momente exportu.
- **Databáza nie je pripojená.** Treba založiť vlastnú Neon (alebo inú Postgres)
  databázu, skopírovať `.env.example` do `.env`, doplniť `DATABASE_URL` a spustiť
  `npm run prisma:migrate` (resp. `npx prisma migrate deploy` na produkcii).
- **Appka nie je nasadená.** Treba založiť nový Vercel projekt a napojiť ho na
  tento repozitár.
- `APP_PASSWORD` a `CRON_SECRET` treba nastaviť ako nové env premenné (staré
  heslo z produkčnej appky TMS-HYDRA sa sem nekopírovalo)..

## Setup

```bash
npm install
cp .env.example .env   # doplň DATABASE_URL
npx prisma migrate deploy
npm run dev
```
