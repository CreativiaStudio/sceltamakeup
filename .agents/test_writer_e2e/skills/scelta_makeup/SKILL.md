# Scelta Makeup — Hub Centrale (Local Copy for test_writer_e2e)

Questo file funge da riferimento locale per test_writer_e2e.
Specifiche chiave verificate:
- Palette: #5E1788 (Royal Violet), #D8C2E7 (Pastel Lilac), #FFFFFF (Optical White), #D462A6 (Mauve Rose), #7A3293 (Vivid Orchid), #1F1B24 (Charcoal Deep)
- Claim: "L'eleganza di essere autentica"
- Pacing Anti-Ban: delay compreso rigorosamente tra 20s e 45s con jitter casuale.
- Variazione Checksum: nessun messaggio identico a livello di string/hash.
- Formule Finanziarie:
  - P_online = round(P_list * 0.90, 2)
  - Deposit = round(P_online * 0.20, 2)
  - Balance = round(P_online - Deposit, 2)
  - Invariante: Deposit + Balance === P_online (zero centesimi di discrepanza).
- Canali di notifica:
  - WhatsApp: Conferma prenotazione, Promemoria 24h, Conferma ordine e-commerce.
  - Resend Email: Responsive HTML con header brandizzato, tabella finanziaria o articoli, link Google/Apple Calendar.
