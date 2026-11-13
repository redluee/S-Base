import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { textToHtml } from "../shared/mail-html";
import { AppError } from "../utils/errors";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new AppError(503, "mail.notConfigured");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  return cachedTransporter;
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
