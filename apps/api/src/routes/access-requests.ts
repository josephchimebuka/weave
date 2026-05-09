import { Router } from 'express';
import { resend } from '../lib/resend';

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FROM_EMAIL  = process.env.RESEND_FROM_EMAIL;

interface AccessRequestPayload {
  company: string;
  email: string;
  useCase: string;
  otherUseCase?: string;
  volume?: string;
  timeline?: string;
}

// ── POST /api/v1/access-requests ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { company, email, useCase, otherUseCase, volume, timeline } = req.body as AccessRequestPayload;

  if (!company || !email || !useCase) {
    return res.status(400).json({
      success: false,
      error: 'Company, email, and use case are required',
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address',
    });
  }

  if (!ADMIN_EMAIL || !FROM_EMAIL) {
    console.error('[access-request] ADMIN_EMAIL or RESEND_FROM_EMAIL is not configured');
    return res.status(500).json({
      success: false,
      error: 'Access request mailer is not configured. Please try again later.',
    });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `New Access Request: ${company}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #0B0F0E;">
          <h2 style="color: #0F5D4C;">New Access Request (Booking Confirmed)</h2>
          <p>A company has requested access AND booked a call on Calendly. Here are their details:</p>

          <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #E8EAE6;">
                <td style="color: #6B7572; padding: 8px 0; font-weight: 600;">Company</td>
                <td style="padding: 8px 0; font-weight: 500;">${escapeHtml(company)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E8EAE6;">
                <td style="color: #6B7572; padding: 8px 0; font-weight: 600;">Email</td>
                <td style="padding: 8px 0; font-weight: 500;"><a href="mailto:${escapeHtml(email)}" style="color: #0F5D4C; text-decoration: none;">${escapeHtml(email)}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #E8EAE6;">
                <td style="color: #6B7572; padding: 8px 0; font-weight: 600;">Use Case</td>
                <td style="padding: 8px 0; font-weight: 500; text-transform: capitalize;">${escapeHtml(useCase.replace('-', ' '))}</td>
              </tr>
              ${otherUseCase ? `
              <tr style="border-bottom: 1px solid #E8EAE6;">
                <td style="color: #6B7572; padding: 8px 0; font-weight: 600;">Details</td>
                <td style="padding: 8px 0; font-weight: 500;">${escapeHtml(otherUseCase)}</td>
              </tr>
              ` : ''}
              ${volume ? `
              <tr style="border-bottom: 1px solid #E8EAE6;">
                <td style="color: #6B7572; padding: 8px 0; font-weight: 600;">Volume</td>
                <td style="padding: 8px 0; font-weight: 500;">${escapeHtml(volume)}</td>
              </tr>
              ` : ''}
              ${timeline ? `
              <tr>
                <td style="color: #6B7572; padding: 8px 0; font-weight: 600;">Timeline</td>
                <td style="padding: 8px 0; font-weight: 500; text-transform: capitalize;">${escapeHtml(timeline.replace(/_/g, ' '))}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <p style="margin-top: 24px; padding: 12px; background: #FDFDFB; border-left: 3px solid #0F5D4C; border-radius: 4px;">
            <strong>Booking Confirmed:</strong> They've already booked a call on your Calendly. Check your Calendly email for the booking details and time.
          </p>

          <p style="font-size: 12px; color: #9B9FA1; margin-top: 48px; border-top: 1px solid #E8EAE6; padding-top: 24px;">
            This is an automated message from your Weave access request system.
          </p>
        </div>
      `,
    });

    if (error) {
      // Resend rejected the send (bad API key, sandbox/from-domain restriction,
      // recipient blocked, etc). The booking is already confirmed on Calendly,
      // so don't fail the user-facing request — but make the failure loud in
      // logs so it's debuggable.
      console.error('[access-request] Resend error:', error);
      return res.json({
        success: true,
        data: { message: 'Booking confirmed; admin notification failed (logged).' },
      });
    }

    console.log('[access-request] Notification sent', { id: data?.id, company, email });
    return res.json({
      success: true,
      data: { message: 'Access request submitted successfully' },
    });
  } catch (err: any) {
    console.error('[access-request] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request. Please try again later.',
    });
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default router;
