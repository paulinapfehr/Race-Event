# Race Event App

Admin-Tool für Kältekammer-Events. Verwalte Teilnehmer und buche Zeitslots live vor Ort.

## Funktionen
- Teilnehmer anlegen & verwalten
- Buchungen für alle Anwendungen (Kältekammer, Massage, MCS, Flow, Training, Body Scan, Bio-Impedanz, Pause)
- Kältekammer: max. 1 Person gleichzeitig, max. 6 Runden pro Person, 18 Min gesamt pro Runde
- Echtzeit-Updates (alle Geräte sehen sofort Änderungen)
- Persönlicher Plan für jeden Teilnehmer unter /plan/[id]

## Setup

1. Supabase-Projekt anlegen (siehe Anleitung)
2. SQL aus der Anleitung ausführen
3. Environment Variables in Vercel setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Mit Vercel verbinden → automatisches Deployment
