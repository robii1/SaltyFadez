# Fresh Fade - Frisørbooking Nettside PRD

## Opprinnelig Problemstilling
Bygge en frisørnettside hvor man kan bestille klipp. Kun fade for nå, enkel dato/tidvalg, varighet ca 30-45 min, gjestebestilling med telefonnummer og/eller e-post. Minimalistisk design. Norsk språk med NOK valuta.

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
- Hero-seksjon med "FRESH FADE" branding
- Tjenester: Fade (300 kr), Klassisk Klipp (250 kr), Skjegg Trim (150 kr)
- 4-stegs bestillingsflyt:
  1. Velg Dato (Kalender)
  2. Velg Tid (Ledige tider)
  3. Dine Detaljer (Navn, Telefon/E-post)
  4. Bekreftelse
- Toast-varsler for tilbakemelding
- Mobilvennlig design
- Mørkt tema med røde aksenter

### Designsystem
- Fonter: Anton (overskrifter), Manrope (brødtekst)
- Farger: Zinc-950 bg, Red-600 aksent, Zinc-50 tekst
- Skarpe kanter (rounded-none)

## Prioritert Backlog

### P1 (Høy Prioritet)
- [ ] E-post/SMS bekreftelse
- [ ] Admin dashboard for bestillinger
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
