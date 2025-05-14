import asyncHandler from '../middleware/asyncHandler.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Send contact form email
// @route   POST /api/contact
// @access  Public
const sendContactEmail = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('Please fill all fields');
  }

  try {
    await sendEmail({
      email: process.env.ADMIN_EMAIL || process.env.EMAIL_USERNAME,
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message.replace(/\n/g, '<br>')}</p>
      `
    });

    // Send confirmation email to the user
    await sendEmail({
      email: email,
      subject: 'Thank you for contacting us',
      html: `
        <h3>Thank you for contacting ShopSmart!</h3>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p>Best regards,</p>
        <p>The ShopSmart Team</p>
      `
    });

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    res.status(500);
    throw new Error(`Email could not be sent: ${error.message}`);
  }
});

// @desc    Submit contact form (without saving to database)
// @route   POST /api/contact
// @access  Public
const submitContactForm = asyncHandler(async (req, res) => {
  const { email, phone, message } = req.body;

  if (!email || !message) {
    res.status(400);
    throw new Error('Email and message are required');
  }

  // Prepare email content
  const htmlContent = `
    <h2>New Contact Form Submission</h2>
    <p><strong>From:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
    <p><strong>Message:</strong> ${message}</p>
    <p>Submitted on: ${new Date().toLocaleString()}</p>
  `;

  // Send email notification to the business/admin
  try {
    const recipientEmail = process.env.BUSINESS_EMAIL || 'kwadjofrancis004@gmail.com';
    
    if (!recipientEmail) {
      throw new Error('No business email configured');
    }
    
    await sendEmail({
      email: recipientEmail,
      subject: 'New Customer Message from Website',
      message: `You have received a new message from ${email}: ${message}`,
      html: htmlContent
    });
    
    res.status(201).json({ message: 'Your message has been sent successfully' });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(201).json({ 
      message: 'Your message has been received, but there was an issue with email delivery',
      emailError: true
    });
  }
});

export { sendContactEmail, submitContactForm };
