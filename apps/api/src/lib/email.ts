import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@weave.dev';

/**
 * Send password reset email with OTP code
 */
export async function sendPasswordResetEmail(email: string, otpCode: string, resetToken: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email not sent for', email);
    return;
  }

  try {
    const resetLink = `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/auth/reset-password?resetToken=${encodeURIComponent(resetToken)}`;
    
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset Your Weave Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { color: #0F5D4C; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              .content { color: #333; line-height: 1.6; margin-bottom: 20px; }
              .code-box { 
                background: #f5f5f5; 
                border-left: 4px solid #0F5D4C; 
                padding: 15px; 
                margin: 20px 0; 
                font-family: monospace; 
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 4px;
                text-align: center;
              }
              .button {
                display: inline-block;
                background: #0F5D4C;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: bold;
                margin: 20px 0;
              }
              .footer { 
                color: #999; 
                font-size: 12px; 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #eee; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">Weave</div>
              
              <div class="content">
                <p>Hello,</p>
                <p>We received a request to reset the password for your Weave merchant account. If you didn't make this request, you can safely ignore this email.</p>
                
                <p><strong>Your password reset code is:</strong></p>
                <div class="code-box">${otpCode}</div>
                
                <p><strong>This code expires in 15 minutes.</strong></p>
                
                <p>Use this code in the password reset form at:</p>
                <a href="${resetLink}" class="button">Reset Password</a>
                
                <p style="color: #666; font-size: 13px;">Or copy this link into your browser:<br/>
                <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${resetLink}</code></p>
              </div>
              
              <div class="footer">
                <p>
                  This is an automated message, please do not reply to this email.
                  <br/>© 2026 Weave. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Password Reset Code: ${otpCode}

This code expires in 15 minutes.

Use this code in the password reset form at:
${resetLink}

If you didn't request this reset, please ignore this email.

© 2026 Weave
      `.trim(),
    });

    console.log(`[email] Password reset email sent to ${email}`);
  } catch (error: any) {
    console.error('[email] Failed to send password reset email:', error.message);
    // Don't throw — logging failure is sufficient, let auth flow continue
  }
}

/**
 * Send welcome email to new merchant
 */
export async function sendWelcomeEmail(email: string, userName: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Welcome email not sent for', email);
    return;
  }

  try {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3001';

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Weave — Your Crypto ↔ Fiat Checkout',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { color: #0F5D4C; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              .content { color: #333; line-height: 1.6; margin-bottom: 20px; }
              .button {
                display: inline-block;
                background: #0F5D4C;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: bold;
                margin: 20px 0;
              }
              .feature-box {
                background: #f9f9f9;
                border: 1px solid #eee;
                border-radius: 6px;
                padding: 15px;
                margin: 15px 0;
              }
              .footer { 
                color: #999; 
                font-size: 12px; 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #eee; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">Welcome to Weave 🚀</div>
              
              <div class="content">
                <p>Hi ${userName},</p>
                
                <p>Your Weave merchant account is ready! You can now accept payments in crypto from any chain, and receive funds in your preferred corridor — fiat to your bank account, or crypto to your wallet.</p>
                
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                
                <h3 style="color: #0F5D4C;">What you can do now:</h3>
                
                <div class="feature-box">
                  <strong>📊 View Orders</strong>
                  <p>Track all incoming transactions in real-time with detailed status and settlement information.</p>
                </div>
                
                <div class="feature-box">
                  <strong>⚙️ Configure Payouts</strong>
                  <p>Set up your bank account or crypto wallet as the destination for your merchant payouts.</p>
                </div>
                
                <div class="feature-box">
                  <strong>🔌 Integrate Checkout</strong>
                  <p>Embed Weave into your site with a few lines of code. Documentation is available in Settings.</p>
                </div>
                
                <h3 style="color: #0F5D4C;">Next steps:</h3>
                <ol>
                  <li>Visit your <a href="${dashboardUrl}">dashboard</a></li>
                  <li>Configure your payout destination in Settings</li>
                  <li>Get your API key from the Integration section</li>
                  <li>Integrate the checkout widget into your store</li>
                </ol>
                
                <p>Questions? Reply to this email or visit our docs at <a href="https://docs.weave.dev">docs.weave.dev</a></p>
              </div>
              
              <div class="footer">
                <p>
                  © 2026 Weave. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to Weave!

Your merchant account is ready. Visit your dashboard to get started:
${dashboardUrl}

Next steps:
1. Visit your dashboard
2. Configure your payout destination
3. Get your API key
4. Integrate the checkout widget

Questions? Reply to this email or visit docs.weave.dev

© 2026 Weave
      `.trim(),
    });

    console.log(`[email] Welcome email sent to ${email}`);
  } catch (error: any) {
    console.error('[email] Failed to send welcome email:', error.message);
  }
}

/**
 * Send order status update email
 */
export async function sendOrderStatusEmail(
  email: string,
  orderId: string,
  status: string,
  amount: string,
  currency: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Order email not sent for', email);
    return;
  }

  try {
    const dashboardUrl = `${process.env.DASHBOARD_URL || 'http://localhost:3001'}/transactions/${orderId}`;
    const statusEmoji = {
      completed: '✅',
      processing: '⏳',
      failed: '❌',
      refunded: '↩️',
    }[status] || '📦';

    const statusDisplay = {
      completed: 'Completed',
      processing: 'Processing',
      failed: 'Failed',
      refunded: 'Refunded',
    }[status] || status;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Order ${statusEmoji} Order ${orderId.slice(0, 8)} ${statusDisplay}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .status-box {
                text-align: center;
                padding: 30px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .status-completed { background: #d4edda; color: #155724; }
              .status-processing { background: #fff3cd; color: #856404; }
              .status-failed { background: #f8d7da; color: #721c24; }
              .status-refunded { background: #d1ecf1; color: #0c5460; }
              .status-box h2 { margin: 0 0 10px 0; font-size: 28px; }
              .order-details {
                background: #f9f9f9;
                border: 1px solid #eee;
                border-radius: 6px;
                padding: 15px;
                margin: 15px 0;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
              }
              .detail-row:last-child { border-bottom: none; }
              .button {
                display: inline-block;
                background: #0F5D4C;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: bold;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="color: #0F5D4C;">Order Update</h1>
              
              <div class="status-box status-${status}">
                <h2>${statusDisplay}</h2>
                <p>Order ${orderId.slice(0, 8)}</p>
              </div>
              
              <div class="order-details">
                <div class="detail-row">
                  <span>Order ID</span>
                  <strong>${orderId}</strong>
                </div>
                <div class="detail-row">
                  <span>Amount</span>
                  <strong>${amount} ${currency}</strong>
                </div>
                <div class="detail-row">
                  <span>Status</span>
                  <strong>${statusDisplay}</strong>
                </div>
              </div>
              
              <a href="${dashboardUrl}" class="button">View Full Details</a>
              
              <p style="color: #666; margin-top: 30px;">
                This is an automated notification from Weave.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Order ${statusDisplay}

Order ID: ${orderId}
Amount: ${amount} ${currency}
Status: ${statusDisplay}

View details: ${dashboardUrl}

© 2026 Weave
      `.trim(),
    });

    console.log(`[email] Order status email sent to ${email}`);
  } catch (error: any) {
    console.error('[email] Failed to send order status email:', error.message);
  }
}
