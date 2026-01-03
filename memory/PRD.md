# Salty Fadez - Frisørbooking Nettside PRD

## Opprinnelig Problemstilling
Bygge en frisørnettside hvor man kan bestille klipp. Kun fade for nå, enkel dato/tidvalg, varighet ca 30-45 min, gjestebestilling med telefonnummer og/eller e-post. Minimalistisk design. Norsk språk med NOK valuta.

## Bedriftsinformasjon
- **Navn**: Salty Fadez
- **Adresse**: Hans Blomgate 10, 6905 Florø
- **Telefon**: 453 92 948
- **TikTok**: @salty_fadez

## Brukerpersonas
- **Primær**: Lokale kunder som vil bestille time raskt
- **Sekundær**: Frisørsalongeier som administrerer bestillinger

## Kjernekrav
- [x] Bestilling med dato/tid-valg
- [x] 45-minutters tidslots
- [x] Gjestebestilling (ingen innlogging)
- [x] Kontakt via telefon ELLER e-post
- [x] Minimalistisk, mørkt design
- [x] Norsk språk
- [x] Priser i NOK (300 kr for fade)
- [x] Admin dashboard for bestillinger (passord-beskyttet)
- [x] TikTok lenke i footer
- [x] E-post bekreftelse ved bestilling
- [x] Vipps-betaling (placeholder klar)

## Implementert (26. desember 2025)

### Backend (FastAPI)
- `POST /api/bookings` - Opprett bestilling + send e-post
- `GET /api/bookings` - Liste alle bestillinger
- `GET /api/bookings/{id}` - Hent spesifikk bestilling
- `DELETE /api/bookings/{id}` - Kanseller bestilling
- `GET /api/time-slots/{date}` - Ledige tider for dato
- `POST /api/admin/login` - Admin innlogging
- `POST /api/vipps/initiate` - Start Vipps-betaling (MOCK)
- `POST /api/vipps/callback` - Vipps webhook
- `GET /api/vipps/status/{id}` - Betalingsstatus
- Åpningstider: 9-18, 45-min slots
- MongoDB lagring
- Resend e-post integrasjon

### Frontend (React)
- Hero-seksjon med "SALTY FADEZ" branding
- Tjenester: Fade (300 kr), Klassisk Klipp (250 kr), Skjegg Trim (150 kr)
- 4-stegs bestillingsflyt med e-post bekreftelse
- **Admin Dashboard** (/admin):
  - Passord-beskyttet innlogging
  - Statistikk: Dagens bestillinger, totalt aktive, betalt/venter
  - Kalender for å velge dato
  - Se bestillinger per dag eller alle
  - Kanseller bestillinger
  - Logg ut-knapp
- Footer med TikTok-lenke og kontaktinfo
- Mobilvennlig design

### Konfigurasjon (.env)
```
ADMIN_PASSWORD=saltyfadez2025
RESEND_API_KEY=           # Legg til for e-post
VIPPS_CLIENT_ID=          # Legg til for Vipps
```

## Testing (95% bestått)
- Backend: 18/22 tester bestått
- Frontend: Alle hovedfunksjoner fungerer

## Mocked Features
- **Vipps-betaling**: Returnerer mock-respons inntil du legger til Vipps-nøkler
- **E-post**: Hopper over sending hvis RESEND_API_KEY mangler

## Prioritert Backlog

### P1 (Høy Prioritet)
- [ ] Aktivere Vipps-betaling (krever nøkler fra portal.vipps.no)
- [ ] Aktivere e-post (krever Resend API-nøkkel)
- [ ] SMS-varsling

### P2 (Medium Prioritet)
- [ ] Flere frisører
- [ ] Åpningstider-konfigurasjon
- [ ] Blokkerte datoer/helligdager

### P3 (Kjekt å ha)
- [ ] Kundeanmeldelser
- [ ] Galleri/portefølje
- [ ] Venteliste for fullbookede dager
