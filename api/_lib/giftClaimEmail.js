// The "{gifter} sent you a gift" email, sent to the recipient of a gifted
// page right after checkout (see api/stripe-webhook.js's handleGiftCheckout).
// Branded multipart HTML + plain text, same as the gifter confirmation —
// see api/_lib/giftConfirmationEmail.js for the why (this app otherwise
// sends plain-text-only transactional email via Resend's /emails API).
//
// The claim link is the recipient's only credential — it carries the
// Stripe Checkout Session id and is the single way into api/get-gift.js.
//
// Fonts: Lora + DM Sans via <link> for clients that allow it; the
// Georgia / Helvetica fallback stack carries the rest, which is most of
// them — the design never depends on the web fonts for legibility.

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const firstName = (full) => String(full || "").trim().split(/\s+/)[0] || "";

// { recipientName, gifterName, giftMessage, claimUrl } -> { subject, html, text }
export function renderGiftClaimEmail({ recipientName, gifterName, giftMessage, claimUrl } = {}) {
  const recipient = firstName(recipientName);
  const gifterFirst = firstName(gifterName); // "" when the gifter left it blank
  const gifterLabel = gifterFirst || "Someone"; // sentence-leading
  const gifterLower = gifterFirst || "someone"; // mid-sentence
  const note = String(giftMessage || "").trim();
  const url = claimUrl || "https://www.myandthen.com/";

  const subject = `${gifterLabel} sent you a gift`;

  const text = [
    recipient ? `Hi ${recipient},` : "Hi,",
    "",
    `${gifterLabel} thought you might want a place to gather someone's story — a page on And Then, already paid for and waiting for you whenever you're ready. No account needed to get started, and no clock running on when you do.`,
    "",
    note ? `"${note}"${gifterFirst ? `\n— ${gifterFirst}` : ""}` : null,
    note ? "" : null,
    "Claim your page:",
    url,
    "",
    'A note from our founder: "I built And Then after being asked to give my mom\'s eulogy — and realizing how many stories and photos other people were holding that I\'d never seen. This is my attempt to gather all of it, guided by the right questions, before it\'s lost. I hope you love building yours." — Staci Harvey',
    "",
    "— And Then",
    "A living story for someone you love.",
    `You're receiving this because ${gifterLower} gifted you a page on myandthen.com.`,
    "© 2026 And Then.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const G = esc(gifterLabel);
  const Glower = esc(gifterLower);
  const HREF = esc(url);

  const noteBlock = note
    ? `
          <!-- Personal note -->
          <tr>
            <td class="fluid-padding" style="padding: 30px 48px 0 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5EDE0; border-left: 3px solid #B85C2C;">
                <tr>
                  <td style="padding: 26px 32px;">
                    <p class="serif" style="margin: 0; font-size: 19px; font-style: italic; line-height: 1.55; color: #2D2118;">
                      &ldquo;${esc(note)}&rdquo;
                    </p>${gifterFirst ? `
                    <p class="sans" style="margin: 14px 0 0 0; font-size: 12px; font-weight: 500; letter-spacing: 0.1em; color: #B85C2C;">
                      &mdash; ${esc(gifterFirst.toUpperCase())}
                    </p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${esc(subject)}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<style>
  body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #EAE2D3; }
  a { text-decoration: none; }
  .serif { font-family: 'Lora', Georgia, 'Times New Roman', serif; }
  .sans { font-family: 'DM Sans', Helvetica, Arial, sans-serif; }
  @media only screen and (max-width: 600px) {
    .email-container { width: 100% !important; }
    .fluid-padding { padding-left: 24px !important; padding-right: 24px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#EAE2D3;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${G} sent you a gift &mdash; a page on And Then, already paid for and waiting for you.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EAE2D3;">
    <tr>
      <td align="center" style="padding: 48px 16px;">

        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FDFAF5;">

          <!-- Header / wordmark -->
          <tr>
            <td class="fluid-padding" style="padding: 36px 48px 28px 48px; border-bottom: 1px solid rgba(45,33,24,0.12);">
              <span class="serif" style="font-size: 22px; font-style: italic; color: #B85C2C; letter-spacing: 0.01em;">And Then&hellip;</span>
            </td>
          </tr>

          <!-- Eyebrow + headline -->
          <tr>
            <td class="fluid-padding" style="padding: 44px 48px 0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-bottom: 1px solid #B85C2C; width: 28px; padding-bottom: 8px;">&nbsp;</td>
                  <td style="width: 10px;">&nbsp;</td>
                  <td class="sans" style="font-size: 11px; font-weight: 500; letter-spacing: 0.14em; color: #B85C2C; padding-bottom: 8px;">A GIFT FOR YOU</td>
                </tr>
              </table>
              <h1 class="serif" style="margin: 18px 0 0 0; font-size: 30px; line-height: 1.32; font-weight: 400; color: #2D2118;">
                ${G} thought you might want a place to gather <em style="color:#B85C2C; font-style: italic;">someone's story</em>.
              </h1>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td class="fluid-padding" style="padding: 20px 48px 0 48px;">
              <p class="sans" style="margin:0; font-size: 16px; line-height: 1.7; color: #5B4636;">
                It's a page on And Then &mdash; already paid for, and waiting for you whenever you're ready. No account needed to get started, and no clock running on when you do.
              </p>
            </td>
          </tr>
${noteBlock}
          <!-- CTA -->
          <tr>
            <td class="fluid-padding" align="left" style="padding: 34px 48px 0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#B85C2C;">
                    <a href="${HREF}" class="sans" style="display:inline-block; padding: 15px 40px; font-size: 15px; font-weight: 500; color:#FDFAF5; letter-spacing:0.01em;">Claim your page</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Founder's note -->
          <tr>
            <td class="fluid-padding" style="padding: 36px 48px 0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="sans" style="font-size: 11px; font-weight: 500; letter-spacing: 0.14em; color: #B85C2C; padding-bottom: 10px;">A NOTE FROM OUR FOUNDER</td>
                </tr>
              </table>
              <p class="serif" style="margin: 0; font-size: 15px; font-style: italic; line-height: 1.65; color: #5B4636;">
                &ldquo;I built And Then after being asked to give my mom's eulogy &mdash; and realizing how many stories and photos other people were holding that I'd never seen. This is my attempt to gather all of it, guided by the right questions, before it's lost. I hope you love building yours.&rdquo;
              </p>
              <p class="sans" style="margin: 12px 0 0 0; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; color: #7A5C42;">
                &mdash; STACI HARVEY, FOUNDER OF AND THEN
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="fluid-padding" style="padding: 40px 48px 0 48px;">
              <div style="border-top: 1px solid rgba(45,33,24,0.12);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="fluid-padding" style="padding: 28px 48px 40px 48px;">
              <span class="serif" style="font-size: 15px; font-style: italic; color: #B85C2C;">And Then&hellip;</span>
              <p class="sans" style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.6; color: #7A5C42;">
                A living story for someone you love.
              </p>
              <p class="sans" style="margin: 18px 0 0 0; font-size: 12px; line-height: 1.7; color: #A08D79;">
                You're receiving this because ${Glower} gifted you a page on myandthen.com.<br />
                &copy; 2026 And Then.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
