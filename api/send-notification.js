const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipients, subject, message } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !subject || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ error: 'SMTP no configurado. Define SMTP_HOST, SMTP_USER, SMTP_PASS en las variables de entorno de Vercel.' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.NOTIFICATION_FROM || 'notificaciones@traline.vercel.app',
      bcc: recipients,
      subject: subject,
      html: message.replace(/\n/g, '<br>'),
    });
    res.json({ success: true, sent: recipients.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
