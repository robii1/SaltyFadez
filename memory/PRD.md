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
- [x] Admin dashboard for bestillinger
- [x] TikTok lenke i footer

## Implementert (26. desember 2025)

### Backend (FastAPI)
- `POST /api/bookings` - Opprett bestilling
- `GET /api/bookings` - Liste alle bestillinger
- `GET /api/bookings/{id}` - Hent spesifikk bestilling
- `DELETE /api/bookings/{id}` - Kanseller bestilling
- `GET /api/time-slots/{date}` - Ledige tider for dato
- Åpningstider: 9-18, 45-min slots
- MongoDB lagring

### Frontend (React)
- Hero-seksjon med "SALTY FADEZ" branding
- Tjenester: Fade (300 kr), Klassisk Klipp (250 kr), Skjegg Trim (150 kr)
- 4-stegs bestillingsflyt:
  1. Velg Dato (Kalender)
  2. Velg Tid (Ledige tider)
  3. Dine Detaljer (Navn, Telefon/E-post)
  4. Bekreftelse
- **Admin Dashboard** (/admin):
  - Kalender for å velge dato
  - Se bestillinger per dag eller alle
  - Kanseller bestillinger
  - Oppdater-knapp
- Footer med TikTok-lenke og kontaktinfo
- Mobilvennlig design
- Mørkt tema med røde aksenter

### Designsystem
- Fonter: Anton (overskrifter), Manrope (brødtekst)
- Farger: Zinc-950 bg, Red-600 aksent, Zinc-50 tekst
- Skarpe kanter (rounded-none)

## Testing (100% bestått)
- Backend: 16/16 tester bestått
- Frontend: Alle tester bestått

## Prioritert Backlog

### P1 (Høy Prioritet)
- [ ] E-post/SMS bekreftelse
- [ ] Flere frisører

### P2 (Medium Prioritet)
- [ ] Flere tjenester med ulike varigheter
- [ ] Åpningstider-konfigurasjon
- [ ] Blokkerte datoer/helligdager
- [ ] Google Kalender integrasjon

### P3 (Kjekt å ha)
- [ ] Kundeanmeldelser
- [ ] Galleri/portefølje
- [ ] Online betaling (Vipps)
- [ ] Venteliste for fullbookede dager
