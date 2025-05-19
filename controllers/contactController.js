// controllers/contactController.js
import asyncHandler from '../middleware/asyncHandler.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Handle contact form submissions
// @route   POST /api/contact
// @access  Public
const contactController = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  // 1) Basic validation
  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('All fields (name, email, subject, message) are required');
  }

  // Determine the admin/business recipient
  const adminEmail = process.env.BUSINESS_EMAIL;
  if (!adminEmail) {
    res.status(500);
    throw new Error('No recipient email configured');
  }

  // 2) Build the admin notification
  const adminHtml = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
    <hr/>
    <p>Sent on: ${new Date().toLocaleString()}</p>
  `;

  // 3) Send to admin
  await sendEmail({
    email: adminEmail,
    subject: `Contact Form: ${subject}`,
    html: adminHtml,
    text: message,
  });

  // 4) (Optional) send confirmation back to the user
  const userHtml = `
    <h2>Thank you for contacting us!</h2>
    <p>Hi ${name},</p>
    <p>We’ve received your message and will get back to you shortly.</p>
    <p>— The ShopSmart Team</p>
  `;
  await sendEmail({
    email: email,
    subject: 'We received your message',
    html: userHtml,
    text: 'Thank you for contacting us! We have received your message.',
  });

  // 5) Respond to the client
  res.status(200).json({ success: true, message: 'Your message has been sent.' });
});

export default contactController;
