const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.EMAIL_FROM || 'noreply@prezidox.com',
  name:  process.env.EMAIL_FROM_NAME || 'Prezidox Academy',
};

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─── HELPER ───────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  try {
    await sgMail.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('SendGrid error:', err?.response?.body || err.message);
    // Don't throw — email failure should not crash the request
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────

function baseTemplate(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #F9F8F5; margin: 0; padding: 0; }
        .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #E4E1DC; }
        .header { background: #0B1F3A; padding: 28px 32px; }
        .header h1 { color: #E5A100; font-size: 22px; margin: 0; }
        .header p { color: rgba(255,255,255,0.6); font-size: 12px; margin: 4px 0 0; }
        .body { padding: 32px; }
        .body h2 { color: #0B1F3A; font-size: 20px; margin: 0 0 12px; }
        .body p { color: #5C5854; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
        .btn { display: inline-block; background: #E5A100; color: #1C1C1E; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; }
        .footer { padding: 20px 32px; background: #F5F4F1; border-top: 1px solid #E4E1DC; font-size: 11px; color: #9B9790; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="header">
          <h1>Prezidox Academy</h1>
          <p>Nigerian CBT Exam Preparation Platform</p>
        </div>
        <div class="body">${content}</div>
        <div class="footer">
          Prezidox Academy is an independent educational platform not affiliated with UNILAG, OAU, JAMB, WAEC, NECO, or JUPEB.<br/>
          &copy; 2026 Prezidox Academy. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}

// Welcome + email verification
async function sendVerificationEmail(user, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your Prezidox Academy email',
    html: baseTemplate(`
      <h2>Welcome, ${user.firstName}!</h2>
      <p>Thank you for creating a Prezidox Academy account. Please verify your email address to activate your account and start your 48-hour free trial.</p>
      <p><a class="btn" href="${link}">Verify Email Address</a></p>
      <p style="font-size:12px;color:#9B9790;">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
    `),
  });
}

// Trial started
async function sendTrialStartedEmail(user) {
  const expiry = new Date(user.trialExpiresAt).toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  await sendEmail({
    to: user.email,
    subject: 'Your 48-hour free trial has started',
    html: baseTemplate(`
      <h2>Your trial is active, ${user.firstName}!</h2>
      <p>Your 48-hour free trial has started. You have full access to all exam modes and subjects for your selected category.</p>
      <p><strong>Trial expires:</strong> ${expiry}</p>
      <p>After your trial ends, you will need a subscription to continue practising.</p>
      <p><a class="btn" href="${APP_URL}/dashboard.html">Go to Dashboard</a></p>
    `),
  });
}

// Trial expiring soon (24hrs warning)
async function sendTrialExpiringEmail(user) {
  await sendEmail({
    to: user.email,
    subject: 'Your Prezidox Academy trial ends tomorrow',
    html: baseTemplate(`
      <h2>Your trial ends in 24 hours</h2>
      <p>Hi ${user.firstName}, your free trial expires tomorrow. Subscribe now to keep full access to all exam modes and continue your preparation.</p>
      <p><a class="btn" href="${APP_URL}/subscription.html">View Subscription Plans</a></p>
    `),
  });
}

// Trial expired
async function sendTrialExpiredEmail(user) {
  await sendEmail({
    to: user.email,
    subject: 'Your Prezidox Academy trial has ended',
    html: baseTemplate(`
      <h2>Your trial has ended</h2>
      <p>Hi ${user.firstName}, your 48-hour free trial has ended. Subscribe to regain full access to all exam modes and continue preparing for your exam.</p>
      <p><a class="btn" href="${APP_URL}/subscription.html">Subscribe Now</a></p>
    `),
  });
}

// Subscription confirmed
async function sendSubscriptionConfirmEmail(user, subscription) {
  const planNames = {
    unilag: 'UNILAG Post-UTME 2026',
    oau:    'OAU Post-UTME 2026',
    bundle: 'All Exams 2026 Bundle',
  };
  const expiry = new Date(subscription.expiresAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  await sendEmail({
    to: user.email,
    subject: 'Subscription confirmed — Prezidox Academy',
    html: baseTemplate(`
      <h2>Subscription confirmed!</h2>
      <p>Hi ${user.firstName}, your payment was successful.</p>
      <p><strong>Plan:</strong> ${planNames[subscription.plan] || subscription.plan}<br/>
      <strong>Amount paid:</strong> ₦${((subscription.amountPaid || 0) / 100).toLocaleString()}<br/>
      <strong>Valid until:</strong> ${expiry}</p>
      <p>Your subscription expires when your exam is written. No recurring charges.</p>
      <p><a class="btn" href="${APP_URL}/dashboard.html">Start Practising</a></p>
    `),
  });
}

// Password reset
async function sendPasswordResetEmail(user, token) {
  const link = `${APP_URL}/reset-password.html?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your Prezidox Academy password',
    html: baseTemplate(`
      <h2>Reset your password</h2>
      <p>Hi ${user.firstName}, you requested a password reset. Click the button below to set a new password.</p>
      <p><a class="btn" href="${link}">Reset Password</a></p>
      <p style="font-size:12px;color:#9B9790;">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>
    `),
  });
}

// Password changed notification
async function sendPasswordChangedEmail(user) {
  await sendEmail({
    to: user.email,
    subject: 'Your Prezidox Academy password was changed',
    html: baseTemplate(`
      <h2>Password changed</h2>
      <p>Hi ${user.firstName}, your password was successfully changed.</p>
      <p>If you did not make this change, contact us immediately at support@prezidox.com</p>
    `),
  });
}

module.exports = {
  sendVerificationEmail,
  sendTrialStartedEmail,
  sendTrialExpiringEmail,
  sendTrialExpiredEmail,
  sendSubscriptionConfirmEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
};
