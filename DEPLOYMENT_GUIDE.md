# 🚀 Salty Fadez - Deployment Guide

## Hvordan få nettsiden opp og kjøre

### Alternativ 1: Deploy via Emergent (Anbefalt - Enklest)

Emergent-plattformen du bruker nå har innebygd deployment. Her er stegene:

#### Steg 1: Klikk på "Deploy" knappen
- I Emergent-grensesnittet, finn **Deploy**-knappen øverst til høyre
- Klikk på den for å starte deployment-prosessen

#### Steg 2: Velg deployment-type
- **Preview**: Midlertidig URL for testing
- **Production**: Permanent URL for din live side

#### Steg 3: Konfigurer miljøvariabler
Før du deployer, sørg for at følgende er satt i `/app/backend/.env`:

```env
# Påkrevd
MONGO_URL=mongodb://...        # Din MongoDB connection string
DB_NAME=salty_fadez            # Database navn
ADMIN_PASSWORD=ditt_passord    # Bytt til et sikkert passord!

# Valgfritt (for e-post)
RESEND_API_KEY=re_xxx          # Fra resend.com

# Valgfritt (for Vipps)
VIPPS_CLIENT_ID=xxx
VIPPS_CLIENT_SECRET=xxx
VIPPS_SUBSCRIPTION_KEY=xxx
VIPPS_MERCHANT_SERIAL_NUMBER=xxx
```

#### Steg 4: Få din URL
Etter deployment får du en URL som:
- `https://salty-fadez.preview.emergentagent.com` (preview)
- Eller et custom domene hvis du har satt det opp

---

### Alternativ 2: Koble til eget domene

Hvis du vil bruke et eget domene (f.eks. `saltyfadez.no`):

1. Kjøp domene fra en registrar (Domeneshop, One.com, etc.)
2. I Emergent, gå til **Settings** → **Custom Domain**
3. Legg til ditt domene
4. Oppdater DNS-innstillingene hos din domene-leverandør:
   - Type: `CNAME`
   - Host: `@` eller `www`
   - Verdi: (gis av Emergent)

---

### Alternativ 3: GitHub-integrasjon

For automatisk deployment ved kodeendringer:

1. I Emergent, gå til **Settings** → **GitHub**
2. Koble til din GitHub-konto
3. Opprett et repository for prosjektet
4. Push koden til GitHub
5. Emergent deployer automatisk ved hver push

---

## Sjekkliste før du går live

### Sikkerhet
- [ ] Bytt `ADMIN_PASSWORD` til noe sikkert (ikke `saltyfadez2025`)
- [ ] Sett opp HTTPS (automatisk med Emergent)

### Funksjonalitet
- [ ] Test bookingflyt fra start til slutt
- [ ] Test admin-innlogging
- [ ] Verifiser at TikTok-lenken fungerer

### Valgfritt
- [ ] Legg til Resend API-nøkkel for e-postbekreftelser
- [ ] Registrer Vipps-konto på portal.vipps.no for betaling

---

## Vanlige problemer

### "Siden laster ikke"
- Sjekk at backend kjører: `sudo supervisorctl status`
- Sjekk backend-logger: `tail -f /var/log/supervisor/backend.err.log`

### "Database-feil"
- Verifiser at `MONGO_URL` er korrekt i `.env`
- Sjekk at MongoDB-serveren er tilgjengelig

### "E-post sendes ikke"
- Legg til `RESEND_API_KEY` i `.env`
- Restart backend: `sudo supervisorctl restart backend`

---

## Kontakt support

Trenger du hjelp? Bruk chat-funksjonen i Emergent eller kontakt support.

---

## Teknisk stack

| Komponent | Teknologi |
|-----------|-----------|
| Frontend | React + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | MongoDB |
| E-post | Resend |
| Betaling | Vipps (placeholder) |

---

*Lykke til med Salty Fadez! ✂️*
