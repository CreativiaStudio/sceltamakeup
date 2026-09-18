import { Appointment } from "@/types/booking";
import { Order } from "@/types/order";
import {
  BookingFinancials,
  EmailDispatchResult,
  EmailRenderOutput,
  NotificationTemplateType,
} from "@/types/notification";

const STORAGE_EMAILS_KEY = "scelta_makeup_dispatched_emails_v1";
const STORE_NAME = "Scelta Makeup Salone";
const STORE_ADDRESS = "Via dei Pellegrini 28/29, 80132 Napoli (NA)";
const OFFICIAL_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Scelta Makeup <onboarding@resend.dev>";

// Official Brand Palette
export const BRAND_PALETTE = {
  royalViolet: "#5E1788", // Primary brand color
  vividOrchid: "#7A3293", // Accent & secondary
  pastelLilac: "#D8C2E7", // Soft walls & borders
  mauveRose: "#D462A6", // Lip pictogram accent & badges
  charcoalDeep: "#1F1B24", // High-contrast text
  opticalWhite: "#FFFFFF", // Crisp card background
  softLilacWash: "#FAF7FC", // Light background wash
  metallicBorder: "#E9DFF2", // Soft separator border
};

/**
 * Mathematical Financial Engine:
 * - 10% exclusive online booking discount
 * - 20% online confirmation deposit
 * - 80% remaining balance due in salone
 * Guarantees that depositPaid + balanceDue === priceOnline to the exact cent.
 */
export function calculateBookingFinancials(priceList: number): BookingFinancials {
  const safeList = Math.max(0, priceList);
  // 10% online discount
  const discountOnline = Math.round(safeList * 0.1 * 100) / 100;
  // Online price = List Price - Discount
  const priceOnline = Math.round((safeList - discountOnline) * 100) / 100;
  // 20% online deposit
  const depositPaid = Math.round(priceOnline * 0.2 * 100) / 100;
  // 80% store balance due = exact difference to prevent zero-cent discrepancies
  const balanceDue = Math.round((priceOnline - depositPaid) * 100) / 100;

  return {
    priceList: safeList,
    discountOnline,
    priceOnline,
    depositPaid,
    balanceDue,
  };
}

// Google Calendar URL Generator
function generateGoogleCalendarUrl(
  title: string,
  details: string,
  location: string,
  dateStr: string,
  timeStr: string,
  durationMinutes = 60
): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
    const dates = `${formatUtc(start)}/${formatUtc(end)}`;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      details,
      location,
      dates,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return "https://calendar.google.com";
  }
}

// Apple Calendar (.ics) Data URI Generator
function generateAppleCalendarDataUri(
  title: string,
  details: string,
  location: string,
  dateStr: string,
  timeStr: string,
  durationMinutes = 60
): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Scelta Makeup//Boutique Appointments//IT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:scelta-${Date.now()}@sceltamakeup.it`,
      `DTSTAMP:${formatUtc(new Date())}`,
      `DTSTART:${formatUtc(start)}`,
      `DTEND:${formatUtc(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  } catch {
    return "#";
  }
}

// Common Brand Header HTML
function getEmailHeader(): string {
  return `
  <!-- BRAND HEADER -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, ${BRAND_PALETTE.royalViolet} 0%, ${BRAND_PALETTE.vividOrchid} 100%); border-radius: 20px 20px 0 0; text-align: center; padding: 36px 20px;">
    <tr>
      <td align="center">
        <!-- Stylized Vector Logo Icon -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 14px auto;">
          <tr>
            <td style="width: 52px; height: 52px; background-color: #FFFFFF; border-radius: 50%; text-align: center; vertical-align: middle; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: bold; color: ${BRAND_PALETTE.royalViolet}; line-height: 52px;">S</span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; letter-spacing: 4px; font-weight: 700; color: #FFFFFF; text-transform: uppercase;">
          SCELTA <span style="font-weight: 300; color: ${BRAND_PALETTE.pastelLilac};">MAKEUP</span>
        </h1>
        <p style="margin: 6px 0 0 0; font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 13px; letter-spacing: 2px; color: ${BRAND_PALETTE.pastelLilac};">
          L'eleganza di essere autentica
        </p>
      </td>
    </tr>
  </table>
  `;
}

// Common Brand Footer HTML
function getEmailFooter(): string {
  return `
  <!-- BRAND FOOTER -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND_PALETTE.softLilacWash}; border-radius: 0 0 20px 20px; border-top: 1px solid ${BRAND_PALETTE.metallicBorder}; padding: 32px 24px; text-align: center;">
    <tr>
      <td>
        <p style="margin: 0 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-weight: bold; font-size: 15px; color: ${BRAND_PALETTE.royalViolet};">
          ${STORE_NAME}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 12px; color: ${BRAND_PALETTE.charcoalDeep}; opacity: 0.8; line-height: 1.6;">
          📍 Boutique: ${STORE_ADDRESS}<br/>
          💬 Assistenza & WhatsApp: <span style="color: ${BRAND_PALETTE.royalViolet}; font-weight: bold;">+39 379 337 0322 (Federica)</span><br/>
          ✉️ Email: <a href="mailto:info@sceltamakeup.it" style="color: ${BRAND_PALETTE.royalViolet}; text-decoration: none;">info@sceltamakeup.it</a>
        </p>
        <p style="margin: 14px 0 0 0; font-size: 11px; color: #8C8294; line-height: 1.4;">
          Federica Cesiano — P.IVA 09914431219 — Salita San Nicola da Tolentino 16, Napoli<br/>
          Ricevi questa comunicazione a conferma di un servizio prenotato o di un acquisto effettuato su Scelta Makeup.
        </p>
      </td>
    </tr>
  </table>
  `;
}

/**
 * 1. Booking Confirmation Email Template
 */
export function renderBookingConfirmationEmail(context: {
  customerName: string;
  serviceName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  operatorName?: string;
  durationMinutes?: number;
  financials: BookingFinancials;
}): EmailRenderOutput {
  const {
    customerName,
    serviceName,
    bookingCode,
    bookingDate,
    bookingTime,
    operatorName = "Federica Cesiano",
    durationMinutes = 60,
    financials,
  } = context;

  const subject = `Conferma Prenotazione: ${serviceName} | Scelta Makeup Salone`;

  const eventTitle = `Scelta Makeup: ${serviceName}`;
  const eventDetails = `Appuntamento per ${serviceName} con ${operatorName} presso Scelta Makeup. Codice prenotazione: ${bookingCode}. Saldo residuo da corrispondere in salone: €${financials.balanceDue.toFixed(2)}.`;
  const googleCalUrl = generateGoogleCalendarUrl(
    eventTitle,
    eventDetails,
    STORE_ADDRESS,
    bookingDate,
    bookingTime,
    durationMinutes
  );
  const appleCalUri = generateAppleCalendarDataUri(
    eventTitle,
    eventDetails,
    STORE_ADDRESS,
    bookingDate,
    bookingTime,
    durationMinutes
  );

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: ${BRAND_PALETTE.softLilacWash}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <!-- Container Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${BRAND_PALETTE.opticalWhite}; border-radius: 20px; box-shadow: 0 10px 30px rgba(94, 23, 136, 0.08); border: 1px solid ${BRAND_PALETTE.metallicBorder}; overflow: hidden;">
          <tr>
            <td>
              ${getEmailHeader()}

              <!-- MAIN CONTENT BODY -->
              <div style="padding: 36px 28px;">
                <!-- Greeting Badge -->
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="display: inline-block; padding: 6px 16px; background-color: #F1E7F8; color: ${BRAND_PALETTE.royalViolet}; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    ✨ Prenotazione Riservata con Successo
                  </span>
                  <h2 style="margin: 16px 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: ${BRAND_PALETTE.charcoalDeep};">
                    Cara ${customerName},
                  </h2>
                  <p style="margin: 0; font-size: 14px; color: #585060; line-height: 1.6;">
                    Abbiamo riservato la postazione e la professionista in via del tutto esclusiva per il tuo momento di bellezza in salone.
                  </p>
                </div>

                <!-- APPOINTMENT DETAILS CARD -->
                <div style="background-color: ${BRAND_PALETTE.softLilacWash}; border-radius: 16px; border: 1px solid ${BRAND_PALETTE.metallicBorder}; padding: 22px; margin-bottom: 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom: 12px; border-bottom: 1px dashed ${BRAND_PALETTE.metallicBorder};">
                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${BRAND_PALETTE.vividOrchid}; font-weight: bold;">Trattamento Selezionato</span>
                        <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: bold; color: ${BRAND_PALETTE.royalViolet}; margin-top: 2px;">
                          ${serviceName}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px dashed ${BRAND_PALETTE.metallicBorder};">
                        <table role="presentation" width="100%">
                          <tr>
                            <td width="50%">
                              <span style="font-size: 11px; color: #7B7283; font-weight: 600;">📅 Data</span>
                              <div style="font-size: 14px; font-weight: 700; color: ${BRAND_PALETTE.charcoalDeep}; margin-top: 2px;">${bookingDate}</div>
                            </td>
                            <td width="50%">
                              <span style="font-size: 11px; color: #7B7283; font-weight: 600;">⏰ Orario</span>
                              <div style="font-size: 14px; font-weight: 700; color: ${BRAND_PALETTE.royalViolet}; margin-top: 2px;">${bookingTime} (${durationMinutes} min)</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 12px;">
                        <table role="presentation" width="100%">
                          <tr>
                            <td width="50%">
                              <span style="font-size: 11px; color: #7B7283; font-weight: 600;">👩‍🎨 Professionista</span>
                              <div style="font-size: 13px; font-weight: 600; color: ${BRAND_PALETTE.charcoalDeep}; margin-top: 2px;">${operatorName}</div>
                            </td>
                            <td width="50%">
                              <span style="font-size: 11px; color: #7B7283; font-weight: 600;">🔖 Codice Prenotazione</span>
                              <div style="font-size: 13px; font-weight: 700; color: ${BRAND_PALETTE.royalViolet}; margin-top: 2px; font-family: monospace;">${bookingCode}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- TRANSPARENT FINANCIAL TABLE -->
                <div style="margin-bottom: 28px;">
                  <h3 style="margin: 0 0 14px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; color: ${BRAND_PALETTE.charcoalDeep};">
                    Riepilogo Tariffa Trasparente
                  </h3>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 13px; color: ${BRAND_PALETTE.charcoalDeep};">
                    <tr style="border-bottom: 1px solid #F0E8F5;">
                      <td style="padding: 10px 0; color: #6D6475;">Prezzo di Listino Salone</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: 600;">€${financials.priceList.toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #F0E8F5;">
                      <td style="padding: 10px 0; color: ${BRAND_PALETTE.vividOrchid}; font-weight: 600;">
                        ✨ Sconto Esclusivo Online (-10%)
                      </td>
                      <td style="padding: 10px 0; text-align: right; color: ${BRAND_PALETTE.vividOrchid}; font-weight: 700;">
                        -€${financials.discountOnline.toFixed(2)}
                      </td>
                    </tr>
                    <tr style="border-bottom: 1px solid #F0E8F5;">
                      <td style="padding: 10px 0; color: #6D6475;">Tariffa Concordata Online</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: 600;">€${financials.priceOnline.toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #F0E8F5; background-color: #F8F4FB;">
                      <td style="padding: 10px 8px; color: #2E7D32; font-weight: 600;">
                        ✓ Quota di Conferma Versata (20%)
                      </td>
                      <td style="padding: 10px 8px; text-align: right; color: #2E7D32; font-weight: 700;">
                        €${financials.depositPaid.toFixed(2)} <span style="font-size: 11px; font-weight: normal;">(Incassata)</span>
                      </td>
                    </tr>
                    <tr style="background-color: #FAF4FD; border-top: 2px solid ${BRAND_PALETTE.pastelLilac};">
                      <td style="padding: 14px 8px; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: bold; color: ${BRAND_PALETTE.royalViolet};">
                        👉 Saldo Residuo in Salone (80%)
                      </td>
                      <td style="padding: 14px 8px; text-align: right; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: bold; color: ${BRAND_PALETTE.royalViolet};">
                        €${financials.balanceDue.toFixed(2)}
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 6px 0 0 0; font-size: 11px; color: #887E92; text-align: right;">
                    (Potrai corrispondere il saldo comodamente in negozio con Carta/POS myPOS o Contanti)
                  </p>
                </div>

                <!-- CALENDAR SYNC BUTTONS -->
                <div style="background-color: #FFFFFF; border: 1px solid ${BRAND_PALETTE.metallicBorder}; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 28px;">
                  <span style="display: block; font-size: 12px; font-weight: 700; color: ${BRAND_PALETTE.vividOrchid}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                    Sincronizza sul tuo Calendario Personale
                  </span>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center">
                        <a href="${googleCalUrl}" target="_blank" style="display: inline-block; margin: 4px 6px; padding: 12px 20px; background-color: ${BRAND_PALETTE.royalViolet}; color: #FFFFFF; text-decoration: none; border-radius: 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                          📅 Google Calendar
                        </a>
                        <a href="${appleCalUri}" download="scelta-makeup-${bookingCode}.ics" style="display: inline-block; margin: 4px 6px; padding: 12px 20px; background-color: ${BRAND_PALETTE.softLilacWash}; color: ${BRAND_PALETTE.royalViolet}; border: 1px solid ${BRAND_PALETTE.pastelLilac}; text-decoration: none; border-radius: 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                          🍎 Apple Calendar (.ics)
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- RESERVATION POLICY & VADEMECUM -->
                <div style="border-left: 3px solid ${BRAND_PALETTE.mauveRose}; background-color: #FAF5F9; padding: 16px; border-radius: 0 12px 12px 0;">
                  <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${BRAND_PALETTE.royalViolet};">
                    🌸 Flessibilità & Politica di Riservazione
                  </h4>
                  <p style="margin: 0; font-size: 12px; color: #625968; line-height: 1.5;">
                    Per offrirti la massima cura, la postazione è riservata per te. Puoi riprogrammare o cancellare il tuo appuntamento senza alcun costo fino a <strong>24 ore prima</strong> dell'orario fissato. In caso di cancellazione con meno di 24h o mancata presentazione, la quota di acconto sarà trattenuta a copertura del tempo non più riallocabile.
                  </p>
                </div>
              </div>

              ${getEmailFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * 2. Booking 24h Reminder Email Template
 */
export function renderBookingReminderEmail(context: {
  customerName: string;
  serviceName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  balanceDue: number;
  durationMinutes?: number;
}): EmailRenderOutput {
  const {
    customerName,
    serviceName,
    bookingCode,
    bookingDate,
    bookingTime,
    balanceDue,
    durationMinutes = 60,
  } = context;

  const subject = `Promemoria: Il tuo appuntamento di bellezza è domani alle ${bookingTime} | Scelta Makeup`;

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: ${BRAND_PALETTE.softLilacWash}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${BRAND_PALETTE.opticalWhite}; border-radius: 20px; box-shadow: 0 10px 30px rgba(94, 23, 136, 0.08); border: 1px solid ${BRAND_PALETTE.metallicBorder}; overflow: hidden;">
          <tr>
            <td>
              ${getEmailHeader()}

              <div style="padding: 36px 28px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="display: inline-block; padding: 6px 16px; background-color: #F8EBF4; color: ${BRAND_PALETTE.mauveRose}; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    ⏰ Mancano 24 Ore alla tua Seduta
                  </span>
                  <h2 style="margin: 16px 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: ${BRAND_PALETTE.charcoalDeep};">
                    Cara ${customerName}, ti aspettiamo domani!
                  </h2>
                  <p style="margin: 0; font-size: 14px; color: #585060; line-height: 1.6;">
                    Il tuo appuntamento esclusivo in salone è programmato per domani. Ecco tutti i dettagli per vivere al meglio la tua esperienza:
                  </p>
                </div>

                <!-- APPOINTMENT REMINDER BOX -->
                <div style="background: linear-gradient(135deg, #FAF4FD 0%, #F5EEFB 100%); border-radius: 16px; border: 1px solid ${BRAND_PALETTE.pastelLilac}; padding: 22px; margin-bottom: 28px;">
                  <table role="presentation" width="100%">
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: ${BRAND_PALETTE.royalViolet}; font-weight: bold;">Servizio Riservato</span>
                        <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 19px; font-weight: bold; color: ${BRAND_PALETTE.royalViolet}; margin-top: 2px;">
                          ${serviceName}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <span style="font-size: 12px; color: #685E70;">📅 <strong>Domani:</strong> ${bookingDate} alle ore <strong style="color: ${BRAND_PALETTE.royalViolet};">${bookingTime}</strong> (${durationMinutes} minuti)</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <span style="font-size: 12px; color: #685E70;">💳 <strong>Saldo dovuto in salone:</strong> €${balanceDue.toFixed(2)} (Carta o Contanti)</span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span style="font-size: 12px; color: #685E70;">🔖 <strong>Codice di riferimento:</strong> <code style="color: ${BRAND_PALETTE.royalViolet};">${bookingCode}</code></span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- VADEMECUM SECTION -->
                <div style="background-color: ${BRAND_PALETTE.softLilacWash}; border-radius: 16px; padding: 20px; margin-bottom: 28px; border: 1px solid ${BRAND_PALETTE.metallicBorder};">
                  <h3 style="margin: 0 0 12px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; color: ${BRAND_PALETTE.royalViolet};">
                    💄 Il tuo Piccolo Vademecum di Bellezza
                  </h3>
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4E4656; line-height: 1.7;">
                    <li><strong>Pelle Detersa:</strong> Ti invitiamo a presentarti a viso ben deterso e idratato, preferibilmente privo di make-up, per massimizzare la resa e la durata del servizio.</li>
                    <li><strong>Massima Puntualità:</strong> Federica riserva lo slot in esclusiva per te. Arrivare con 5 minuti di anticipo ti consentirà di rilassarti e iniziare senza fretta.</li>
                    <li><strong>Eventuali Allergie:</strong> Segnalaci subito qualsiasi sensibilità a principi attivi o prodotti cosmetici.</li>
                  </ul>
                </div>

                <!-- BOUTIQUE MAP & CONTACT CTA -->
                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="https://maps.google.com/?q=Via+dei+Pellegrini+28+Napoli" target="_blank" style="display: inline-block; padding: 14px 26px; background-color: ${BRAND_PALETTE.royalViolet}; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(94, 23, 136, 0.2);">
                    🗺️ Indicazioni Stradali Google Maps
                  </a>
                  <div style="margin-top: 12px; font-size: 12px; color: #25D366; font-weight: bold;">
                    💬 Assistenza WhatsApp: +39 379 337 0322 (Federica)
                  </div>
                </div>

                <!-- CANCELLATION NOTICE -->
                <div style="font-size: 11px; color: #8A8192; line-height: 1.5; text-align: center; padding-top: 12px; border-top: 1px solid #F0E6F6;">
                  Per eventuali urgenze o impedimenti improvvisi puoi contattarci all&apos;email info@sceltamakeup.it. Ricorda che la disdetta gratuita è garantita fino a 24 ore prima dell&apos;appuntamento.
                </div>
              </div>

              ${getEmailFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * 3. E-Commerce Order Placed Email Template
 */
export function renderOrderPlacedEmail(order: Order): EmailRenderOutput {
  const subject = `Conferma Ordine #${order.orderNumber} | Scelta Makeup`;

  const isBoutiquePickup = order.deliveryMethod === "boutique";

  const itemsRows = order.items
    .map((item) => {
      const shadeText = item.shade?.name ? `<br/><span style="font-size: 11px; color: ${BRAND_PALETTE.vividOrchid};">Nuance: ${item.shade.name}</span>` : "";
      return `
      <tr style="border-bottom: 1px solid #F1E8F6;">
        <td style="padding: 14px 0; width: 60px; vertical-align: middle;">
          <div style="width: 50px; height: 50px; border-radius: 8px; background-color: #FAF5FD; border: 1px solid ${BRAND_PALETTE.metallicBorder}; display: flex; align-items: center; justify-content: center; overflow: hidden; text-align: center; line-height: 50px; font-size: 18px;">
            💄
          </div>
        </td>
        <td style="padding: 14px 12px; vertical-align: middle;">
          <div style="font-weight: 700; color: ${BRAND_PALETTE.charcoalDeep}; font-size: 13px;">${item.name}</div>
          <div style="font-size: 11px; color: #7B7283;">${item.brand}${shadeText}</div>
        </td>
        <td style="padding: 14px 6px; text-align: center; vertical-align: middle; font-size: 13px; color: #585060;">
          x${item.quantity}
        </td>
        <td style="padding: 14px 0; text-align: right; vertical-align: middle; font-weight: 700; color: ${BRAND_PALETTE.charcoalDeep}; font-size: 13px;">
          €${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
      `;
    })
    .join("");

  const deliveryBox = isBoutiquePickup
    ? `
    <div style="background-color: #FAF4FD; border: 1px solid ${BRAND_PALETTE.pastelLilac}; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${BRAND_PALETTE.royalViolet}; letter-spacing: 1px; margin-bottom: 6px;">
        📍 Ritiro Gratuito in Salone
      </div>
      <div style="font-size: 13px; color: #4F4656; line-height: 1.6;">
        <strong>Sede:</strong> Scelta Makeup, Via dei Pellegrini 28/29, 80132 Napoli<br/>
        <strong>Orari al pubblico:</strong> Lunedì – Sabato: 09:30 - 13:30 / 16:30 - 20:00<br/>
        Riceverai un messaggio non appena il tuo pacchetto profumato sarà confezionato e pronto al banco.
      </div>
    </div>
    `
    : `
    <div style="background-color: #FAF4FD; border: 1px solid ${BRAND_PALETTE.pastelLilac}; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${BRAND_PALETTE.royalViolet}; letter-spacing: 1px; margin-bottom: 6px;">
        📦 Spedizione Corriere Espresso 24/48h Tracciata
      </div>
      <div style="font-size: 13px; color: #4F4656; line-height: 1.6;">
        <strong>Destinatario:</strong> ${order.customer.nome} ${order.customer.cognome}<br/>
        <strong>Indirizzo:</strong> ${order.customer.indirizzo || ""}, ${order.customer.citta || ""} (${order.customer.cap || ""})<br/>
        ${order.customer.note ? `<strong>Note di consegna:</strong> <em>"${order.customer.note}"</em><br/>` : ""}
        ${order.trackingNumber ? `<strong>Tracking Code:</strong> <code style="color: ${BRAND_PALETTE.royalViolet}; font-weight: bold;">${order.trackingNumber}</code>` : "Ti invieremo un aggiornamento non appena il corriere prenderà in carico la spedizione."}
      </div>
    </div>
    `;

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: ${BRAND_PALETTE.softLilacWash}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${BRAND_PALETTE.opticalWhite}; border-radius: 20px; box-shadow: 0 10px 30px rgba(94, 23, 136, 0.08); border: 1px solid ${BRAND_PALETTE.metallicBorder}; overflow: hidden;">
          <tr>
            <td>
              ${getEmailHeader()}

              <div style="padding: 36px 28px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="display: inline-block; padding: 6px 16px; background-color: #F1E7F8; color: ${BRAND_PALETTE.royalViolet}; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    ✨ Ordine Registrato con Successo
                  </span>
                  <h2 style="margin: 16px 0 8px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: ${BRAND_PALETTE.charcoalDeep};">
                    Grazie per aver scelto Scelta Makeup, ${order.customer.nome}!
                  </h2>
                  <p style="margin: 0; font-size: 14px; color: #585060; line-height: 1.6;">
                    Abbiamo ricevuto il tuo ordine <strong>#${order.orderNumber}</strong> e stiamo preparando i tuoi prodotti cosmetici con la massima cura e dedizione.
                  </p>
                </div>

                <!-- LUXURY PACKAGING & CARE CALLOUT -->
                <div style="background: linear-gradient(135deg, #FFF9FB 0%, #FAF1F7 100%); border: 1px solid #F3CFE3; border-radius: 14px; padding: 16px; margin-bottom: 24px; text-align: center;">
                  <span style="font-size: 14px;">✨</span>
                  <span style="font-size: 12px; font-weight: 700; color: ${BRAND_PALETTE.mauveRose}; text-transform: uppercase; letter-spacing: 0.8px; margin-left: 6px;">
                    Packaging Esclusivo & Cura Artigianale
                  </span>
                  <p style="margin: 6px 0 0 0; font-size: 12px; color: #725064; line-height: 1.5;">
                    Il tuo ordine viene preparato a mano nel nostro Atelier con <strong>confezione sigillata, protetta e profumata</strong>.
                  </p>
                </div>

                <!-- DELIVERY DETAILS -->
                ${deliveryBox}

                <!-- ITEMS TABLE -->
                <div style="margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; color: ${BRAND_PALETTE.charcoalDeep};">
                    Riepilogo Articoli
                  </h3>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                    ${itemsRows}
                  </table>
                </div>

                <!-- TOTALS BREAKDOWN -->
                <div style="background-color: ${BRAND_PALETTE.softLilacWash}; border-radius: 14px; padding: 18px; margin-bottom: 28px; border: 1px solid ${BRAND_PALETTE.metallicBorder};">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: ${BRAND_PALETTE.charcoalDeep};">
                    <tr>
                      <td style="padding-bottom: 8px; color: #6D6475;">Subtotale Articoli</td>
                      <td style="padding-bottom: 8px; text-align: right; font-weight: 600;">€${order.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 8px; color: #6D6475;">Spedizione</td>
                      <td style="padding-bottom: 8px; text-align: right; font-weight: 600; color: ${order.shippingCost === 0 ? "#2E7D32" : BRAND_PALETTE.charcoalDeep};">
                        ${order.shippingCost === 0 ? "Gratuita" : `€${order.shippingCost.toFixed(2)}`}
                      </td>
                    </tr>
                    <tr style="border-top: 1px solid ${BRAND_PALETTE.metallicBorder};">
                      <td style="padding-top: 12px; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: bold; color: ${BRAND_PALETTE.royalViolet};">
                        Totale Ordine (IVA incl.)
                      </td>
                      <td style="padding-top: 12px; text-align: right; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: bold; color: ${BRAND_PALETTE.royalViolet};">
                        €${order.total.toFixed(2)}
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center;">
                  <a href="mailto:info@sceltamakeup.it?subject=Assistenza%20Ordine%20${order.id}" style="display: inline-block; padding: 12px 24px; background-color: ${BRAND_PALETTE.royalViolet}; color: #FFFFFF; text-decoration: none; border-radius: 10px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                    Hai bisogno di assistenza sul tuo ordine? Scrivici via Email
                  </a>
                </div>
              </div>

              ${getEmailFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * Universal Template Renderer
 */
export function renderEmailTemplate(
  type: NotificationTemplateType,
  context: Record<string, unknown>
): EmailRenderOutput {
  switch (type) {
    case "booking_confirmation": {
      const priceList = (context.priceList as number) ?? 50.0;
      const financials =
        (context.financials as BookingFinancials) || calculateBookingFinancials(priceList);

      return renderBookingConfirmationEmail({
        customerName: (context.customerName as string) || "Gentile Cliente",
        serviceName: (context.serviceName as string) || "Make-up Evento & Cerimonia",
        bookingCode: (context.bookingCode as string) || "SC-260907-DEMO",
        bookingDate: (context.bookingDate as string) || new Date().toISOString().split("T")[0],
        bookingTime: (context.bookingTime as string) || "13:30",
        operatorName: (context.operatorName as string) || "Federica Cesiano",
        durationMinutes: (context.durationMinutes as number) ?? 60,
        financials,
      });
    }

    case "booking_reminder_24h": {
      return renderBookingReminderEmail({
        customerName: (context.customerName as string) || "Gentile Cliente",
        serviceName: (context.serviceName as string) || "Make-up Evento & Cerimonia",
        bookingCode: (context.bookingCode as string) || "SC-260907-DEMO",
        bookingDate: (context.bookingDate as string) || "Domani",
        bookingTime: (context.bookingTime as string) || "13:30",
        balanceDue: (context.balanceDue as number) ?? 36.0,
        durationMinutes: (context.durationMinutes as number) ?? 60,
      });
    }

    case "order_placed": {
      const order = context.order as Order;
      if (order) {
        return renderOrderPlacedEmail(order);
      }
      // Demo order fallback
      const sampleOrder: Order = {
        id: "ord-sample",
        orderNumber: (context.orderNumber as string) || "SC-ORD-2026-0001",
        customer: {
          nome: (context.customerName as string) || "Giulia",
          cognome: (context.customerSurname as string) || "Moretti",
          email: (context.customerEmail as string) || "giulia.moretti@example.com",
          telefono: "+39 349 765 4321",
          indirizzo: "Via Chiaia 142",
          citta: "Napoli",
          cap: "80121",
        },
        items: [
          {
            id: "item-1",
            productId: "ddp-rosso",
            slug: "ddp-rosso",
            name: "Rossetto Iconico Diego dalla Palma",
            brand: "Diego dalla Palma",
            price: 24.5,
            quantity: 1,
            shade: { id: "01", name: "01 Rosso Rubino" },
            image: "/products/diego-dalla-palma-rossetto-iconico.png",
          },
          {
            id: "item-2",
            productId: "rvb-fondotinta",
            slug: "rvb-fondotinta",
            name: "Fondotinta Anti-Età Effetto Seta",
            brand: "RVB LAB",
            price: 36.0,
            quantity: 1,
            shade: { id: "12", name: "12 Warm Beige" },
            image: "/products/rvb-lab-fondotinta-antieta.png",
          },
        ],
        subtotal: 60.5,
        shippingCost: 0.0,
        total: 60.5,
        deliveryMethod: (context.deliveryMethod as "shipping" | "boutique") || "shipping",
        paymentMethod: "card",
        paymentStatus: "paid",
        status: "processing",
        sampleIncluded: true,
        createdAt: new Date().toISOString(),
      };
      return renderOrderPlacedEmail(sampleOrder);
    }

    case "manual_test":
    default: {
      const priceList = 50.0;
      const financials = calculateBookingFinancials(priceList);
      return renderBookingConfirmationEmail({
        customerName: "Federica Cesiano (Test)",
        serviceName: "Make-up Evento & Cerimonia",
        bookingCode: "SC-TEST-2026",
        bookingDate: "Oggi",
        bookingTime: "13:30",
        operatorName: "Federica Cesiano",
        durationMinutes: 60,
        financials,
      });
    }
  }
}

let memoryEmailLogs: EmailDispatchResult[] = [];

// Local storage management for dispatched emails
function getStoredEmailLogs(): EmailDispatchResult[] {
  if (typeof window === "undefined") return memoryEmailLogs;
  try {
    const raw = localStorage.getItem(STORAGE_EMAILS_KEY);
    return raw ? JSON.parse(raw) : memoryEmailLogs;
  } catch {
    return memoryEmailLogs;
  }
}

function saveStoredEmailLog(result: EmailDispatchResult): void {
  memoryEmailLogs.unshift(result);
  memoryEmailLogs = memoryEmailLogs.slice(0, 50);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_EMAILS_KEY, JSON.stringify(memoryEmailLogs));
  } catch (error) {
    console.error("Failed to save email log to storage:", error);
  }
}

export function getDispatchedEmailsLog(): EmailDispatchResult[] {
  return getStoredEmailLogs();
}

export function clearDispatchedEmailsLog(): void {
  memoryEmailLogs = [];
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_EMAILS_KEY);
  } catch (error) {
    console.error("Failed to clear email logs:", error);
  }
}

/**
 * Universal Resend Dispatcher:
 * - Direct HTTP POST fetch to https://api.resend.com/emails (Zero npm dependencies)
 * - Automatic realistic simulation fallback when RESEND_API_KEY is missing or 'demo'/'mock'
 */
export async function sendResendEmail(payload: {
  to: string;
  recipientName: string;
  templateType: NotificationTemplateType;
  subject: string;
  html: string;
}): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;
  const now = new Date().toISOString();

  // If apiKey is missing, empty, or set to demo/mock, enter realistic simulation mode
  const isSimulation = !apiKey || apiKey === "demo" || apiKey === "mock";

  if (isSimulation) {
    // Realistic simulated dispatch
    const result: EmailDispatchResult = {
      success: true,
      id: `sim-resend-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      templateType: payload.templateType,
      recipientEmail: payload.to,
      recipientName: payload.recipientName,
      subject: payload.subject,
      html: payload.html,
      simulated: true,
      sentAt: now,
    };

    saveStoredEmailLog(result);
    return result;
  }

  // Live Resend API invocation via modern Web fetch
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: OFFICIAL_FROM_EMAIL,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP ${response.status}: ${response.statusText}`;
      const failedResult: EmailDispatchResult = {
        success: false,
        templateType: payload.templateType,
        recipientEmail: payload.to,
        recipientName: payload.recipientName,
        subject: payload.subject,
        html: payload.html,
        simulated: false,
        sentAt: now,
        error: errorMsg,
      };
      saveStoredEmailLog(failedResult);
      return failedResult;
    }

    const successResult: EmailDispatchResult = {
      success: true,
      id: data.id || `resend-${Date.now()}`,
      templateType: payload.templateType,
      recipientEmail: payload.to,
      recipientName: payload.recipientName,
      subject: payload.subject,
      html: payload.html,
      simulated: false,
      sentAt: now,
    };

    saveStoredEmailLog(successResult);
    return successResult;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Errore di connessione a Resend API";
    const failedResult: EmailDispatchResult = {
      success: false,
      templateType: payload.templateType,
      recipientEmail: payload.to,
      recipientName: payload.recipientName,
      subject: payload.subject,
      html: payload.html,
      simulated: false,
      sentAt: now,
      error: errorMsg,
    };
    saveStoredEmailLog(failedResult);
    return failedResult;
  }
}

// High-level wrapper methods for direct consumption
export async function sendBookingConfirmationEmail(
  appointment: Appointment
): Promise<EmailDispatchResult> {
  const financials: BookingFinancials = {
    priceList: appointment.pricing.priceList,
    discountOnline: appointment.pricing.discountOnline,
    priceOnline: appointment.pricing.priceOnline,
    depositPaid: appointment.pricing.depositPaid,
    balanceDue: appointment.pricing.balanceDue,
  };

  const { subject, html } = renderBookingConfirmationEmail({
    customerName: `${appointment.customer.name} ${appointment.customer.surname}`,
    serviceName: appointment.serviceName,
    bookingCode: appointment.bookingCode,
    bookingDate: appointment.date,
    bookingTime: appointment.time,
    operatorName: appointment.operatorName,
    durationMinutes: appointment.durationMinutes,
    financials,
  });

  return sendResendEmail({
    to: appointment.customer.email,
    recipientName: `${appointment.customer.name} ${appointment.customer.surname}`,
    templateType: "booking_confirmation",
    subject,
    html,
  });
}

export async function sendBookingReminderEmail(
  appointment: Appointment
): Promise<EmailDispatchResult> {
  const { subject, html } = renderBookingReminderEmail({
    customerName: `${appointment.customer.name} ${appointment.customer.surname}`,
    serviceName: appointment.serviceName,
    bookingCode: appointment.bookingCode,
    bookingDate: appointment.date,
    bookingTime: appointment.time,
    balanceDue: appointment.pricing.balanceDue,
    durationMinutes: appointment.durationMinutes,
  });

  return sendResendEmail({
    to: appointment.customer.email,
    recipientName: `${appointment.customer.name} ${appointment.customer.surname}`,
    templateType: "booking_reminder_24h",
    subject,
    html,
  });
}

export async function sendOrderPlacedEmail(order: Order): Promise<EmailDispatchResult> {
  const { subject, html } = renderOrderPlacedEmail(order);

  return sendResendEmail({
    to: order.customer.email,
    recipientName: `${order.customer.nome} ${order.customer.cognome}`,
    templateType: "order_placed",
    subject,
    html,
  });
}
