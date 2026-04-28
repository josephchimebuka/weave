import { prisma } from '../lib/prisma';
import { resend } from '../lib/resend';
import jwt from 'jsonwebtoken';

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';
const COMPANY_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@weave.com';

function getAdminSecret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error('[security] ADMIN_SECRET is not set — cannot sign admin tokens');
  return s;
}

function escHtml(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sends a welcome email to a newly signed-up merchant.
 */
export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave <welcome@weave.com>',
      to: [email],
      subject: 'Welcome to Weave 🚀',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0B0F0E;">
          <h1 style="color: #0F5D4C; font-size: 32px;">Welcome to the future of payments.</h1>
          <p>Hi ${name},</p>
          <p>Your Weave merchant account is ready. You're now equipped to accept payments from any blockchain and settle them directly to your destination of choice.</p>
          
          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 20px; padding: 32px; margin: 32px 0;">
            <h3 style="margin-top: 0; color: #0F5D4C;">Next Steps</h3>
            <ul style="padding-left: 20px; color: #4B5552;">
              <li style="margin-bottom: 12px;"><strong>Complete KYB</strong>: Verify your business to increase your processing limits.</li>
              <li style="margin-bottom: 12px;"><strong>Set Payouts</strong>: Add your bank account or crypto wallet in settings.</li>
              <li style="margin-bottom: 12px;"><strong>Integrate</strong>: Use your API keys to embed the Weave widget.</li>
            </ul>
            
            <a href="${dashboardUrl}" style="display: inline-block; background: #0F5D4C; color: white; padding: 14px 28px; border-radius: 99px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              Go to Dashboard
            </a>
          </div>
          
            Need help? Check out our <a href="${dashboardUrl}/docs" style="color: #0F5D4C;">developer documentation</a> or reply directly to this email.
          </p>
          <p style="font-size: 11px; color: #9B9FA1; text-align: center; margin-top: 48px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
            Weave is a product of <strong>Dewdrop Labs</strong>.
          </p>
        </div>
      `
    });
    if (error) {
      console.error(`[email-welcome] Resend Error:`, error);
    } else {
      console.log(`[email-welcome] sent to ${email} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[email-welcome] fatal error:`, err.message);
  }
}

/**
 * Sends a notification to the company admin when a merchant submits KYB.
 * Includes "Magic Link" buttons for immediate approval/rejection.
 */
export async function sendAdminKYBNotification(verificationId: string) {
  try {
    const v = await prisma.businessVerification.findUnique({
      where: { id: verificationId },
      include: { merchant: true }
    });

    if (!v) return;

    // Generate secure tokens for the buttons
    // These expire in 48 hours for security
    const secret = getAdminSecret();
    const approveToken = jwt.sign({ sub: v.id, action: 'approve' }, secret, { expiresIn: '48h' });
    const rejectToken = jwt.sign({ sub: v.id, action: 'reject' }, secret, { expiresIn: '48h' });

    const approveUrl = `${API_URL}/admin/verify?id=${v.id}&action=approve&token=${approveToken}`;
    const rejectUrl = `${API_URL}/admin/verify?id=${v.id}&action=reject&token=${rejectToken}`;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave System <system@weave.com>',
      to: [COMPANY_ADMIN_EMAIL],
      subject: `🚨 New KYB Submission: ${escHtml(v.legalName || v.merchant.name)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #0B0F0E;">
          <h2 style="color: #0F5D4C;">New Merchant KYB Submission</h2>
          <p>A merchant has submitted their business details for verification.</p>

          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="margin-top: 0;">Business Meta</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="color: #6B7572; padding: 6px 0;">Legal Name</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.legalName)}</td></tr>
              <tr><td style="color: #6B7572; padding: 6px 0;">Entity Type</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.entityType)}</td></tr>
              <tr><td style="color: #6B7572; padding: 6px 0;">Reg Number</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.regNumber)}</td></tr>
              <tr><td style="color: #6B7572; padding: 6px 0;">Address</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.businessAddress)}, ${escHtml(v.city)}</td></tr>
              <tr><td style="color: #6B7572; padding: 6px 0;">State/Postal</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.state)} ${escHtml(v.postalCode)}</td></tr>
              <tr><td style="color: #6B7572; padding: 6px 0;">Merchant Email</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.merchant.email)}</td></tr>
            </table>

            <hr style="border: none; border-top: 1px solid #E8EAE6; margin: 20px 0;" />

            <h3 style="margin-top: 0; font-size: 16px;">Documents</h3>
            <div style="margin-top: 10px;">
              ${(v.documentUrls as any[])?.map(doc => {
                // Only render URLs that are safe Cloudinary origins
                const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
                const isSafeUrl = typeof doc.url === 'string' &&
                  (doc.url.startsWith(`https://res.cloudinary.com/${cloudName}/`) ||
                   doc.url.startsWith('https://res.cloudinary.com/'));
                if (!isSafeUrl) return '';
                return `
                <div style="margin-bottom: 8px;">
                  <a href="${escHtml(doc.url)}" target="_blank" rel="noopener noreferrer" style="color: #0F5D4C; font-weight: 600; text-decoration: none;">
                    View ${escHtml(doc.type.replace(/_/g, ' '))} →
                  </a>
                </div>`;
              }).join('') || '<p style="color: #9B9FA1;">No documents attached</p>'}
            </div>
          </div>

          <p>Review the application and take action below. These links are secure and expire in 48 hours.</p>
          
          <div style="margin-top: 32px;">
            <a href="${approveUrl}" style="background: #0F5D4C; color: white; padding: 12px 24px; border-radius: 99px; text-decoration: none; font-weight: 600;">
              Approve Merchant
            </a>
            <a href="${rejectUrl}" style="background: #FFF0F0; color: #d94e4e; padding: 12px 24px; border-radius: 99px; border: 1px solid #FFD1D1; text-decoration: none; font-weight: 600; margin-left: 10px;">
              Reject Application
            </a>
          </div>
          <p style="font-size: 11px; color: #9B9FA1; margin-top: 48px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
            Weave is a product of <strong>Dewdrop Labs</strong>.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`[admin-notify] Resend Error:`, error);
    } else {
      console.log(`[admin-notify] KYB alert sent to ${COMPANY_ADMIN_EMAIL} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[admin-notify] fatal error:`, err.message);
  }
}

/**
 * Notifies the merchant that their KYB application has been approved.
 */
export async function sendMerchantKYBApprovalEmail(merchantId: string) {
  try {
    const m = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!m || !m.email) return;

    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave <onboarding@weave.com>',
      to: [m.email],
      subject: 'Verification Approved: Welcome to Weave Live! ⚡️',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0B0F0E;">
          <h1 style="color: #0F5D4C; font-size: 32px;">You're verified!</h1>
          <p>Hi ${m.name},</p>
          <p>Great news! Our compliance team has approved your business verification. Your Weave account is now fully active with live transaction limits.</p>
          
          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 20px; padding: 32px; margin: 32px 0;">
            <h3 style="margin-top: 0; color: #0F5D4C;">Next Steps</h3>
            <p>You can now start processing live payments and settle them to your local bank or crypto wallet.</p>
            
            <ul style="padding-left: 20px; color: #4B5552;">
              <li style="margin-bottom: 12px;"><strong>Set Payouts</strong>: Ensure your payout destination is correctly set in settings.</li>
              <li style="margin-bottom: 12px;"><strong>Integrate</strong>: Use your live API keys to start accepting payments.</li>
              <li style="margin-bottom: 12px;"><strong>Payment Links</strong>: Create professional payment links for your customers in seconds.</li>
            </ul>
            
            <a href="${dashboardUrl}/settings" style="display: inline-block; background: #0F5D4C; color: white; padding: 14px 28px; border-radius: 99px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              Launch Live Dashboard
            </a>
          </div>
          
          <p style="font-size: 11px; color: #9B9FA1; text-align: center; margin-top: 48px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
            Weave is a product of <strong>Dewdrop Labs</strong>.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`[email-kyb-ok] Resend Error:`, error);
    } else {
      console.log(`[email-kyb-ok] approval sent to ${m.email} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[email-kyb-ok] fatal error:`, err.message);
  }
}

/**
 * Notifies the merchant that their KYB application has been rejected.
 */
export async function sendMerchantKYBRejectionEmail(merchantId: string, reason: string) {
  try {
    const m = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!m || !m.email) return;

    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave <onboarding@weave.com>',
      to: [m.email],
      subject: 'Action Required: Your Verification Update ⚠️',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0B0F0E;">
          <h1 style="color: #A8321E; font-size: 28px;">Verification Update</h1>
          <p>Hi ${m.name},</p>
          <p>Our compliance team has completed the review of your business verification request. Unfortunately, we are unable to approve your application at this time due to the following reason:</p>
          
          <div style="background: #FFF0F0; border: 1px solid #FFD1D1; border-radius: 16px; padding: 24px; margin: 24px 0; color: #A8321E;">
            <p style="margin: 0; font-weight: 600;">Reason for Rejection:</p>
            <p style="margin: 8px 0 0 0; line-height: 1.5;">${reason || 'One or more documents were invalid or unclear.'}</p>
          </div>

          <p><strong>What should you do next?</strong></p>
          <p>You can rectify the issues mentioned above and update your application details. Please ensure all documents are clear, valid, and match your business registration.</p>
          
          <a href="${dashboardUrl}/onboarding/kyb" style="display: inline-block; background: #0F5D4C; color: white; padding: 14px 28px; border-radius: 99px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Update Application
          </a>
          
          <p style="margin-top: 32px; font-size: 13px; color: #6B7572;">
            If you have any questions or believe this was a mistake, please reply to this email to speak with our support team.
          </p>
          
          <p style="font-size: 11px; color: #9B9FA1; text-align: center; margin-top: 48px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
            Weave is a product of <strong>Dewdrop Labs</strong>.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`[email-kyb-no] Resend Error:`, error);
    } else {
      console.log(`[email-kyb-no] rejection sent to ${m.email} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[email-kyb-no] fatal error:`, err.message);
  }
}

/**
 * Sends a support ticket from a merchant to the Weave support team.
 */
export async function sendSupportEmail(payload: { name: string; email: string; topic: string; message: string }) {
  try {
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@weave.com';

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave Support <support@weave.com>',
      to: [supportEmail],
      subject: `[Support Request] ${escHtml(payload.topic)}: ${escHtml(payload.name)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #0B0F0E;">
          <h2 style="color: #0F5D4C;">New Support Inbound</h2>
          <p>You have received a new message from the merchant dashboard.</p>

          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 12px; padding: 24px; margin: 24px 0;">
             <p><strong>Merchant:</strong> ${escHtml(payload.name)}</p>
             <p><strong>Email:</strong> ${escHtml(payload.email)}</p>
             <p><strong>Topic:</strong> ${escHtml(payload.topic)}</p>
             <hr style="border: none; border-top: 1px solid #E8EAE6; margin: 16px 0;" />
             <p style="white-space: pre-wrap; line-height: 1.6;">${escHtml(payload.message)}</p>
          </div>

          <p style="font-size: 12px; color: #9B9FA1;">
            Reply directly to this email to contact <strong>${escHtml(payload.email)}</strong>.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`[email-support] Resend Error:`, error);
    } else {
      console.log(`[email-support] ticket sent to ${supportEmail} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[email-support] fatal error:`, err.message);
  }
}

/**
 * Handles all transactional email notifications for the Weave platform via Resend.
 */
export async function sendMerchantPaymentNotification(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        merchant: true,
        sourceInstrument: true,
        destInstrument: true
      }
    });

    if (!order || !order.merchant.email) {
      console.warn(`[email] could not find order ${orderId} or merchant email`);
      return;
    }

    const m = order.merchant;
    const amountStr = `${Math.round(order.destAmount || 0)} ${order.destAssetKey.split(':').pop()}`;
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave <payments@weave.com>',
      to: [m.email],
      subject: `💰 New Payment Received: ${amountStr}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0B0F0E;">
          <h2 style="color: #0F5D4C;">New Payment Received</h2>
          <p>Hi ${m.name},</p>
          <p>Great news! You just received a new payment via Weave.</p>
          
          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="font-size: 14px; color: #6B7572; margin-bottom: 4px;">Settlement Amount</div>
            <div style="font-size: 32px; font-weight: 700;">${amountStr}</div>
            
            <hr style="border: none; border-top: 1px solid #E8EAE6; margin: 20px 0;" />
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #6B7572;">Order ID</span>
              <span style="font-weight: 600;">${order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6B7572;">Customer</span>
              <span style="font-weight: 600;">${order.sourceInstrument?.bankAccountName || 'Verified Customer'}</span>
            </div>
          </div>
          
          <p>The funds have been automatically settled to your designated payout account.</p>
          
          <a href="${dashboardUrl}/transactions/${order.id}" 
             style="display: inline-block; background: #0F5D4C; color: white; padding: 12px 24px; border-radius: 99px; text-decoration: none; font-weight: 600; margin-top: 12px;">
            View Transaction details
          </a>
          
          <p style="font-size: 13px; color: #6B7572; margin-top: 40px; border-top: 1px solid #E8EAE6; pt: 20px;">
            This email was sent by Weave. If you have any questions, reply to this email or contact support.
          </p>
          <p style="font-size: 11px; color: #9B9FA1; text-align: center; margin-top: 24px;">
            Weave is a product of <strong>Dewdrop Labs</strong>.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`[email] Resend error for order ${orderId}:`, error);
    } else {
      console.log(`[email] payment notification sent to ${m.email} for order ${orderId} (resend_id: ${data?.id})`);
    }

  } catch (err: any) {
    console.error(`[email] failed to send merchant notification:`, err.message);
  }
}

/**
 * Sends a 6-digit OTP code for login or security verification.
 */
export async function sendOtpEmail(email: string, code: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave Auth <auth@weave.com>',
      to: [email],
      subject: `${code} is your Weave verification code`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 40px; margin: 0 auto; color: #0B0F0E; background: #FDFDFB; border-radius: 24px; border: 1px solid #E8EAE6;">
           <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Verification Code</h2>
           <p style="color: #6B7572; font-size: 15px; margin-bottom: 32px;">Please use the following 6-digit code to verify your identity.</p>
           
           <div style="background: #0F5D4C; color: white; font-size: 36px; font-weight: 800; letter-spacing: 8px; padding: 24px; border-radius: 16px; text-align: center; font-family: monospace;">
             ${code}
           </div>
           
           <p style="color: #6B7572; font-size: 13px; margin-top: 32px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
             This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
           </p>
           <p style="font-size: 11px; color: #9B9FA1; text-align: center; margin-top: 24px;">
             Weave is a product of <strong>Dewdrop Labs</strong>.
           </p>
        </div>
      `
    });
    if (error) {
      console.error(`[email-otp] Resend Error:`, error);
    } else {
      console.log(`[email-otp] code sent to ${email} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[email-otp] fatal error:`, err.message);
  }
}

/**
 * Sends a password reset email with both a magic link and a manual OTP code.
 */
export async function sendPasswordResetEmail(email: string, otpCode: string, resetToken: string) {
  try {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    // OTP is displayed separately in the email body — never included in the URL
    // so that intercepting the link alone is not sufficient to reset the password.
    const resetUrl = `${dashboardUrl}/auth/reset-password?resetToken=${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave Security <security@weave.com>',
      to: [email],
      subject: 'Reset your Weave password',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 40px; margin: 0 auto; color: #0B0F0E; background: #FDFDFB; border-radius: 24px; border: 1px solid #E8EAE6;">
           <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">Password Reset</h2>
           <p style="color: #6B7572; font-size: 15px; margin-bottom: 24px;">We received a request to reset your password. You can use the code below or click the button to continue.</p>
           
           <div style="background: #F4F5F3; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
             <span style="display: block; font-size: 12px; color: #6B7572; text-transform: uppercase; tracking: 0.1em; margin-bottom: 4px;">Verification Code</span>
             <span style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #0F5D4C;">${otpCode}</span>
           </div>

           <a href="${resetUrl}" style="display: block; background: #0F5D4C; color: white; padding: 16px 32px; border-radius: 99px; text-decoration: none; font-weight: 600; text-align: center;">
             Reset Password
           </a>
           
           <p style="color: #6B7572; font-size: 13px; margin-top: 32px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
             This link will expire in 1 hour. If you didn't request this, your password will remain unchanged.
           </p>
           <p style="font-size: 11px; color: #9B9FA1; text-align: center; margin-top: 24px;">
             Weave is a product of <strong>Dewdrop Labs</strong>.
           </p>
        </div>
      `
    });
    if (error) {
      console.error(`[email-reset] Resend Error:`, error);
    } else {
      console.log(`[email-reset] full reset package sent to ${email} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[email-reset] fatal error:`, err.message);
  }
}

/**
 * Notifies the Weave admins that a merchant has requested account deletion.
 */
export async function sendDeletionRequestEmail(merchantId: string, email: string, name: string, reason: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Weave System <system@weave.com>',
      to: [COMPANY_ADMIN_EMAIL],
      subject: `⚠️ Account Deletion Request: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #0B0F0E;">
          <h2 style="color: #d94e4e;">Merchant Deletion Request</h2>
          <p>A merchant has requested to delete their account. As per policy, support must reach out to settle their account and clear compliance checks.</p>
          
          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="margin-top: 0;">Merchant Details</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="color: #6B7572; pb: 8px;">Merchant ID</td><td style="font-weight: 600; pb: 8px;">${merchantId}</td></tr>
              <tr><td style="color: #6B7572; pb: 8px;">Name</td><td style="font-weight: 600; pb: 8px;">${name}</td></tr>
              <tr><td style="color: #6B7572; pb: 8px;">Email</td><td style="font-weight: 600; pb: 8px;">${email}</td></tr>
              <tr><td style="color: #6B7572;">Provided Reason</td><td style="font-weight: 600;">${reason || 'None provided'}</td></tr>
            </table>
          </div>

          <div style="display: flex; gap: 16px; margin-top: 32px;">
            <a href="mailto:${email}?subject=Regarding your Weave account closure request" style="background: #0F5D4C; color: white; padding: 12px 24px; border-radius: 99px; text-decoration: none; font-weight: 600;">
              Contact Merchant
            </a>
          </div>
          <p style="font-size: 11px; color: #9B9FA1; margin-top: 48px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
            Weave is a product of <strong>Dewdrop Labs</strong>.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`[admin-notify] Resend Error for deletion request:`, error);
    } else {
      console.log(`[admin-notify] Deletion request alert sent to ${COMPANY_ADMIN_EMAIL} (id: ${data?.id})`);
    }
  } catch (err: any) {
    console.error(`[admin-notify] fatal error sending deletion request:`, err.message);
  }
}
