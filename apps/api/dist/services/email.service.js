"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendAdminKYBNotification = sendAdminKYBNotification;
exports.sendMerchantPaymentNotification = sendMerchantPaymentNotification;
exports.sendOtpEmail = sendOtpEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const prisma_1 = require("../lib/prisma");
const resend_1 = require("../lib/resend");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'super-secret-admin-key';
const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';
const COMPANY_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@weave.com';
/**
 * Sends a welcome email to a newly signed-up merchant.
 */
async function sendWelcomeEmail(email, name) {
    try {
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
        const { data, error } = await resend_1.resend.emails.send({
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
        }
        else {
            console.log(`[email-welcome] sent to ${email} (id: ${data?.id})`);
        }
    }
    catch (err) {
        console.error(`[email-welcome] fatal error:`, err.message);
    }
}
/**
 * Sends a notification to the company admin when a merchant submits KYB.
 * Includes "Magic Link" buttons for immediate approval/rejection.
 */
async function sendAdminKYBNotification(verificationId) {
    try {
        const v = await prisma_1.prisma.businessVerification.findUnique({
            where: { id: verificationId },
            include: { merchant: true }
        });
        if (!v)
            return;
        // Generate secure tokens for the buttons
        // These expire in 48 hours for security
        const approveToken = jsonwebtoken_1.default.sign({ sub: v.id, action: 'approve' }, ADMIN_SECRET, { expiresIn: '48h' });
        const rejectToken = jsonwebtoken_1.default.sign({ sub: v.id, action: 'reject' }, ADMIN_SECRET, { expiresIn: '48h' });
        const approveUrl = `${API_URL}/admin/verify?id=${v.id}&action=approve&token=${approveToken}`;
        const rejectUrl = `${API_URL}/admin/verify?id=${v.id}&action=reject&token=${rejectToken}`;
        const { data, error } = await resend_1.resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Weave System <system@weave.com>',
            to: [COMPANY_ADMIN_EMAIL],
            subject: `🚨 New KYB Submission: ${v.legalName || v.merchant.name}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #0B0F0E;">
          <h2 style="color: #0F5D4C;">New Merchant KYB Submission</h2>
          <p>A merchant has submitted their business details for verification.</p>
          
          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="margin-top: 0;">Business Meta</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="color: #6B7572; pb: 8px;">Legal Name</td><td style="font-weight: 600; pb: 8px;">${v.legalName}</td></tr>
              <tr><td style="color: #6B7572; pb: 8px;">Entity Type</td><td style="font-weight: 600; pb: 8px;">${v.entityType}</td></tr>
              <tr><td style="color: #6B7572; pb: 8px;">Reg Number</td><td style="font-weight: 600; pb: 8px;">${v.regNumber}</td></tr>
              <tr><td style="color: #6B7572; pb: 8px;">Merchant Name</td><td style="font-weight: 600; pb: 8px;">${v.merchant.name}</td></tr>
              <tr><td style="color: #6B7572;">Merchant Email</td><td style="font-weight: 600;">${v.merchant.email}</td></tr>
            </table>
          </div>

          <p>Review the application and take action below. These links are secure and expire in 48 hours.</p>
          
          <div style="display: flex; gap: 16px; margin-top: 32px;">
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
        }
        else {
            console.log(`[admin-notify] KYB alert sent to ${COMPANY_ADMIN_EMAIL} (id: ${data?.id})`);
        }
    }
    catch (err) {
        console.error(`[admin-notify] fatal error:`, err.message);
    }
}
/**
 * Handles all transactional email notifications for the Weave platform via Resend.
 */
async function sendMerchantPaymentNotification(orderId) {
    try {
        const order = await prisma_1.prisma.order.findUnique({
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
        const { data, error } = await resend_1.resend.emails.send({
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
        }
        else {
            console.log(`[email] payment notification sent to ${m.email} for order ${orderId} (resend_id: ${data?.id})`);
        }
    }
    catch (err) {
        console.error(`[email] failed to send merchant notification:`, err.message);
    }
}
/**
 * Sends a 6-digit OTP code for login or security verification.
 */
async function sendOtpEmail(email, code) {
    try {
        const { data, error } = await resend_1.resend.emails.send({
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
        }
        else {
            console.log(`[email-otp] code sent to ${email} (id: ${data?.id})`);
        }
    }
    catch (err) {
        console.error(`[email-otp] fatal error:`, err.message);
    }
}
/**
 * Sends a password reset email with both a magic link and a manual OTP code.
 */
async function sendPasswordResetEmail(email, otpCode, resetToken) {
    try {
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
        const resetUrl = `${dashboardUrl}/auth/reset-password?resetToken=${resetToken}&otp=${otpCode}`;
        const { data, error } = await resend_1.resend.emails.send({
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
        }
        else {
            console.log(`[email-reset] full reset package sent to ${email} (id: ${data?.id})`);
        }
    }
    catch (err) {
        console.error(`[email-reset] fatal error:`, err.message);
    }
}
