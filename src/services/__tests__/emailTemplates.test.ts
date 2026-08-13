import { describe, it, expect } from 'vitest';
import { renderEmailTemplate } from '../emailTemplates';

describe('renderEmailTemplate', () => {
  it('renders a mention template with subject, html and text', () => {
    const t = renderEmailTemplate('mention', {
      mentioner: 'Dr. Aris',
      projectName: 'Quantum Networks',
      comment: 'Please review the section 3 rewrite.',
      url: 'https://paperly.app/p/1',
    });
    expect(t.subject).toContain('Dr. Aris');
    expect(t.subject).toContain('Quantum Networks');
    expect(t.html).toContain('@Dr. Aris');
    expect(t.html).toContain('https://paperly.app/p/1');
    expect(t.text).toContain('review the section 3 rewrite');
  });

  it('renders an invite template', () => {
    const t = renderEmailTemplate('invite', {
      inviter: 'Sophia',
      projectName: 'Survey Paper',
      url: 'https://paperly.app/invite/abc',
    });
    expect(t.subject).toMatch(/invited you to collaborate/);
    expect(t.html).toContain('Sophia');
    expect(t.html).toContain('/invite/abc');
  });

  it('renders a review request template with optional message', () => {
    const t = renderEmailTemplate('review_request', {
      requester: 'Tom',
      projectName: 'ML Benchmarks',
      message: 'Final check before submission.',
      url: 'https://paperly.app/p/9',
    });
    expect(t.subject).toContain('review');
    expect(t.html).toContain('Final check before submission.');
  });

  it('escapes HTML in user-supplied fields', () => {
    const t = renderEmailTemplate('mention', {
      mentioner: '<script>alert(1)</script>',
      projectName: 'A & B',
      comment: 'x',
      url: 'https://paperly.app/p/1',
    });
    expect(t.html).not.toContain('<script>alert(1)</script>');
    expect(t.html).toContain('&lt;script&gt;');
    expect(t.html).toContain('A &amp; B');
  });
});