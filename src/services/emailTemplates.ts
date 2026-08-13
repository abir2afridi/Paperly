export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export type EmailTemplateType = 'mention' | 'invite' | 'review_request';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const baseHtml = (body: string): string => `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-top:4px solid #D11111;">
  <div style="padding:20px 24px;background:#ffffff;">
    <span style="font-size:15px;font-weight:800;color:#0f172a;">Paperly <span style="color:#D11111;">·</span> Notifications</span>
  </div>
  <div style="padding:24px;background:#f8fafc;color:#334155;font-size:14px;line-height:1.6;">
    ${body}
  </div>
  <div style="padding:14px 24px;background:#ffffff;color:#94a3b8;font-size:11px;">
    You received this because your Paperly notification preferences have email delivery enabled.
    Disable it anytime from Settings &rarr; Editor.
  </div>
</div>`;

export function renderEmailTemplate(type: EmailTemplateType, data: Record<string, string>): EmailTemplate {
  switch (type) {
    case 'mention':
      return {
        subject: `@${data.mentioner} mentioned you in "${data.projectName}"`,
        html: baseHtml(`
          <p><strong>@${escapeHtml(data.mentioner)}</strong> mentioned you in the project <strong>${escapeHtml(data.projectName)}</strong>.</p>
          <p style="background:#ffffff;border:1px solid #e2e8f0;padding:12px;border-radius:6px;color:#475569;">${escapeHtml(data.comment)}</p>
          <a href="${escapeHtml(data.url)}" style="display:inline-block;background:#D11111;color:#ffffff;padding:10px 18px;text-decoration:none;font-weight:700;border-radius:4px;">View conversation</a>
        `),
        text: `@${data.mentioner} mentioned you in "${data.projectName}": ${data.comment}`,
      };
    case 'invite':
      return {
        subject: `${data.inviter} invited you to collaborate on "${data.projectName}"`,
        html: baseHtml(`
          <p><strong>${escapeHtml(data.inviter)}</strong> invited you to collaborate on the project <strong>${escapeHtml(data.projectName)}</strong>.</p>
          <a href="${escapeHtml(data.url)}" style="display:inline-block;background:#D11111;color:#ffffff;padding:10px 18px;text-decoration:none;font-weight:700;border-radius:4px;">Open project</a>
        `),
        text: `${data.inviter} invited you to collaborate on "${data.projectName}".`,
      };
    case 'review_request':
      return {
        subject: `${data.requester} requested your review of "${data.projectName}"`,
        html: baseHtml(`
          <p><strong>${escapeHtml(data.requester)}</strong> requested your review of the project <strong>${escapeHtml(data.projectName)}</strong>.</p>
          <p>${escapeHtml(data.message ?? '')}</p>
          <a href="${escapeHtml(data.url)}" style="display:inline-block;background:#D11111;color:#ffffff;padding:10px 18px;text-decoration:none;font-weight:700;border-radius:4px;">Start review</a>
        `),
        text: `${data.requester} requested your review of "${data.projectName}".`,
      };
  }
}

export function sendEmailViaResend(input: {
  apiKey: string;
  from: string;
  to: string;
  template: EmailTemplate;
}): Promise<Response> {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.template.subject,
      html: input.template.html,
      text: input.template.text,
    }),
  });
}