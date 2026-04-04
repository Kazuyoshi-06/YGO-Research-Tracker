import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Si pas de clé configurée, les emails sont silencieusement ignorés
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "YGO Tracker <noreply@example.com>";
const BASE_URL = process.env.EMAIL_BASE_URL ?? "http://localhost:3000";

// ── Templates HTML ─────────────────────────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0d0e12;font-family:'Helvetica Neue',Arial,sans-serif;color:#e8e8e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0e12;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#13151c;border-radius:16px;border:1px solid rgba(201,162,39,0.15);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid rgba(201,162,39,0.10);background:linear-gradient(180deg,rgba(201,162,39,0.06),transparent);">
              <span style="font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#c9a227;">YGO Tracker</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">
                YGO Research Tracker · <a href="${BASE_URL}" style="color:rgba(201,162,39,0.6);text-decoration:none;">${BASE_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(label: string, href: string, color = "#c9a227"): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:rgba(${color === "#c9a227" ? "201,162,39" : "139,92,246"},0.15);border:1px solid rgba(${color === "#c9a227" ? "201,162,39" : "139,92,246"},0.35);border-radius:8px;color:${color};font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.04em;">
    ${label} →
  </a>`;
}

// ── Envoi générique ────────────────────────────────────────────────────────────

async function send(to: string | string[], subject: string, html: string) {
  if (!resend) return; // emails désactivés
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    // Silencieux — les emails ne sont jamais critiques
    console.error("[email] Erreur envoi :", err);
  }
}

// Récupère les emails de tous les users actifs
async function getAllEmails(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { banned: false, email: { not: "" } },
    select: { email: true },
  });
  return users.map((u) => u.email).filter(Boolean);
}

// Récupère les emails des users qui ont soumis pour une vague
async function getSubmitterEmails(waveId: number): Promise<string[]> {
  const submissions = await prisma.orderSubmission.findMany({
    where: { waveId, status: { in: ["submitted", "confirmed"] } },
    include: { user: { select: { email: true } } },
  });
  return submissions.map((s) => s.user.email).filter(Boolean);
}

// ── Emails métier ──────────────────────────────────────────────────────────────

export async function sendWaveOpenEmail(waveName: string, waveId: number, sellerNames: string[]) {
  const emails = await getAllEmails();
  if (emails.length === 0) return;

  const sellersHtml = sellerNames.length > 0
    ? `<p style="margin:12px 0 0;font-size:13px;color:rgba(255,255,255,0.6);">Vendeurs désignés : <strong style="color:#c9a227;">${sellerNames.join(", ")}</strong></p>`
    : "";

  const html = baseTemplate(`Vague ouverte — ${waveName}`, `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#c9a227;letter-spacing:0.05em;">${waveName}</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);">Une nouvelle vague de commande est ouverte. Consultez les vendeurs désignés et soumettez votre liste avant la date limite.</p>
    ${sellersHtml}
    ${btn("Ouvrir le tracker", `${BASE_URL}/tracker/tcg`)}
  `);

  await send(emails, `[YGO Tracker] Vague ouverte — ${waveName}`, html);
}

export async function sendWaveOrderedEmail(waveName: string, waveId: number) {
  const emails = await getSubmitterEmails(waveId);
  if (emails.length === 0) return;

  const html = baseTemplate(`Commande passée — ${waveName}`, `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#c9a227;letter-spacing:0.05em;">Commande passée</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);">La vague <strong style="color:#e8e8e8;">${waveName}</strong> a été commandée. Vos cartes sont en route — vous serez notifié à la livraison.</p>
    ${btn("Voir ma watchlist", `${BASE_URL}/tracker/tcg`)}
  `);

  await send(emails, `[YGO Tracker] Commande passée — ${waveName}`, html);
}

export async function sendWaveDeliveredEmail(waveName: string, waveId: number) {
  const emails = await getSubmitterEmails(waveId);
  if (emails.length === 0) return;

  const html = baseTemplate(`Vague livrée — ${waveName}`, `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.05em;">Vos cartes sont arrivées !</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);">La vague <strong style="color:#e8e8e8;">${waveName}</strong> a été livrée. Vos cartes sont marquées comme reçues dans votre watchlist.</p>
    ${btn("Voir ma watchlist", `${BASE_URL}/tracker/tcg`, "#10b981")}
  `);

  await send(emails, `[YGO Tracker] Livraison — ${waveName}`, html);
}

export async function sendWaveReminderEmail(
  to: string[],
  waveName: string,
  waveId: number,
  deadline: Date
) {
  if (to.length === 0) return;

  const deadlineStr = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  }).format(deadline);

  const html = baseTemplate(`Rappel — ${waveName}`, `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f59e0b;letter-spacing:0.05em;">Rappel : 48h restantes</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);">
      La vague <strong style="color:#e8e8e8;">${waveName}</strong> se termine le
      <strong style="color:#e8e8e8;">${deadlineStr}</strong>.
    </p>
    <p style="margin:12px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">
      Tu n'as pas encore soumis ta liste. Ne rate pas cette vague !
    </p>
    ${btn("Soumettre ma liste", `${BASE_URL}/tracker/tcg`, "#f59e0b")}
  `);

  await send(to, `[YGO Tracker] Rappel — ${waveName} se termine bientôt`, html);
}

export async function sendSubmissionReceivedEmail(adminEmails: string[], userName: string, waveName: string, itemCount: number) {
  if (adminEmails.length === 0) return;

  const html = baseTemplate(`Nouvelle soumission — ${userName}`, `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#8b5cf6;letter-spacing:0.05em;">Nouvelle soumission reçue</h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);"><strong style="color:#e8e8e8;">${userName}</strong> a soumis sa liste pour la vague <strong style="color:#e8e8e8;">${waveName}</strong> — ${itemCount} carte(s).</p>
    ${btn("Voir les soumissions", `${BASE_URL}/admin/waves`, "#8b5cf6")}
  `);

  await send(adminEmails, `[YGO Tracker] Soumission de ${userName}`, html);
}
