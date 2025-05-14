import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  try {
    // Validate required parameters
    if (!options.email) {
      throw new Error('Recipient email is required');
    }
    
    if (!options.subject) {
      throw new Error('Email subject is required');
    }
    
    if (!options.message && !options.html) {
      throw new Error('Email content (message or html) is required');
    }

    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Define email options
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message || '',
      html: options.html || ''
    };

    console.log('Sending email to:', options.email);

    // Verify transporter configuration
    await transporter.verify();
    console.log('Email configuration verified');

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ', info.messageId);
    return info;

  } catch (error) {
    console.error('Email error details:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

export default sendEmail;