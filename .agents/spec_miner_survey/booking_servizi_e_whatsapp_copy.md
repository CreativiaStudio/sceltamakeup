# Modulo Booking Servizi & Comunicazioni Anti-Ban (Local Copy)
Source: C:\Users\mario\.gemini\config\skills\scelta_makeup\references\booking_servizi_e_whatsapp.md

1. Architettura 2 canali paralleli:
- Canale 1: MAKEUP (Postazione Trucco Negozio / Open Space / Federica Cesiano - ATTIVO SUBITO)
- Canale 2: BEAUTY (Stanza Cabina Estetica Privata / Operatrice Estetica Esterna / Dedicata - DISATTIVATO ORA)

2. Tutela Solo-Worker & Orari:
- Fasce fuori orario negozio prioritari: pausa pranzo 13:30-15:30, serali post 20:00 (20:00-21:30), domeniche/mattine chiusura per eventi/sposa
- Time blocking 1-click, buffer pulizia 15 min.

3. Canali Comunicazione:
- Resend per email transazionali (conferma booking, promemoria 24h, cancellazione/modifica)
- Evolution API per WhatsApp (sessione QR code del negozio)

4. Motore Anti-Ban WhatsApp:
- Blocco tecnico broadcast massivi: solo transazionali 1-a-1
- Queue worker asincrono
- Delay casuale con jitter umano: 20–45 secondi tra un messaggio e il successivo
- Spaziatura oraria
- Formattazione dinamica variabile (Nome, orario, trattamento, codice prenotazione, data, consigli pre-trattamento) per hash antispam univoco.

5. Politica Economica Booking:
- 10% sconto prenotazione online sul listino
- Acconto 20% online (Stripe/Apple Pay/Carta)
- Saldo 80% residuo in negozio (contanti o myPOS Go 2)
- Esempio: Listino 50€ -> Online 45€ (-10%) -> Acconto 9€ (20%) -> Saldo in-store 36€ (80%)
- Cancellazione gratuita fino a 24h prima. Sotto le 24h acconto trattenuto.
