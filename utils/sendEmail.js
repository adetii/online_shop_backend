import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // 1. Validate required parameters
  if (!options.email) throw new Error('Recipient email is required');
  if (!options.subject) throw new Error('Email subject is required');
  if (!options.message && !options.html) {
    throw new Error('Email content (message or html) is required');
  }

  // 2. Create transport config
  //    If you set EMAIL_SERVICE (e.g. 'gmail'), nodemailer will ignore host/port.
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,        // e.g. 'gmail'
    host: process.env.EMAIL_HOST,              // fallback if SERVICE not set
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 3. Define mail options
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message || undefined,
    html: options.html || undefined,
  };

  // 4. Send
  try {
    await transporter.verify();
    console.log(`Email transporter verified; sending to ${options.email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('Email send failed:', {
      message: err.message,
      code: err.code,
      response: err.response,
    });
    throw new Error(`Email could not be sent: ${err.message}`);
  }
};

export default sendEmail;
