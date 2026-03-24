import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // On n'accepte que le POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, attachments } = req.body;

  if (!process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'GMAIL_APP_PASSWORD is not configured in Vercel settings' });
  }

  // Initialize Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: (process.env.GMAIL_USER || 'anonyme0x6@gmail.com').trim(),
      pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, ''),
    },
  });

  try {
    const mailOptions = {
      from: `"MediDesk Pro" <${process.env.GMAIL_USER || 'anonyme0x6@gmail.com'}>`,
      to,
      subject: subject || 'Votre certificat médical',
      html: html || '<p>Veuillez trouver ci-joint votre certificat médical.</p>',
      attachments: (attachments || []).map((att: any) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ messageId: info.messageId });
  } catch (error: any) {
    console.error('Error sending email via Gmail:', error);
    return res.status(500).json({ 
      error: 'Failed to send email via Gmail', 
      details: error.message || 'Unknown error' 
    });
  }
}
