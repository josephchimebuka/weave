import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY?.trim();

/** No-op Resend client when RESEND_API_KEY is unset (local dev without email). */
function noopResend(): Resend {
  return {
    emails: {
      send: async () => {
        console.warn('[resend] RESEND_API_KEY not set — email skipped');
        return { data: { id: 'dev-skipped' }, error: null };
      },
    },
  } as unknown as Resend;
}

export const resend = apiKey ? new Resend(apiKey) : noopResend();
