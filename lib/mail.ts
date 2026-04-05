import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

let cached: nodemailer.Transporter | null | undefined;

function getSmtpTransport(): nodemailer.Transporter | null {
  if (cached !== undefined) return cached;
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    cached = null;
    return null;
  }
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "1";
  const opts: SMTPTransport.Options = {
    host,
    port,
    secure,
    /** Port 587: STARTTLS; 465: już TLS (secure=true). */
    requireTLS: !secure && port === 587,
    tls: { minVersion: "TLSv1.2" as const },
  };
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (user && pass) {
    opts.auth = { user, pass };
  }
  cached = nodemailer.createTransport(opts);
  return cached;
}

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Czy wysyłka ma szansę zadziałać (zmienne środowiskowe). */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

export async function sendMail({ to, subject, text, html }: SendMailInput): Promise<void> {
  const transport = getSmtpTransport();
  const from = process.env.SMTP_FROM?.trim();
  if (!transport || !from) {
    console.error(
      "[mail] Pominięto wysyłkę: ustaw SMTP_HOST i SMTP_FROM (oraz zwykle SMTP_USER, SMTP_PASS)."
    );
    return;
  }
  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html: html ?? text.replace(/\n/g, "<br/>"),
  });
}
