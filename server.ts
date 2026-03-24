import express from 'express';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Initialize Nodemailer transporter for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: (process.env.GMAIL_USER || 'anonyme0x6@gmail.com').trim(),
    pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, ''), // Remove all spaces
  },
});

// API Route for sending emails
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html, attachments } = req.body;

  if (!process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'GMAIL_APP_PASSWORD is not configured' });
  }

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
    res.status(200).json({ messageId: info.messageId });
  } catch (error: any) {
    console.error('Error sending email via Gmail:', error);
    res.status(500).json({ 
      error: 'Failed to send email via Gmail', 
      details: error.message || 'Unknown error' 
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if this file is run directly (not as a module)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export default app;
