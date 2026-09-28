import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP is niet geconfigureerd. Stel SMTP_HOST, SMTP_PORT, SMTP_USER en SMTP_PASS in via de backend .env.");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  return cachedTransporter;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const URL_OR_DOMAIN_PATTERN = /(https?:\/\/[^\s<]+)|(\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b)/g;

function textToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(URL_OR_DOMAIN_PATTERN, (match, httpUrl, bareDomain) => {
    const href = httpUrl ?? `https://${bareDomain}`;
    return `<a href="${href}">${match}</a>`;
  });
  return linked.replace(/\n/g, "<br>");
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: textToHtml(options.text),
    attachments: options.attachments,
  });
}
