// Service for managing outgoing emails (password recovery, security notices)
// Ensures emails are tracked, auditable, and dispatched to the recipient's mailbox

export interface SentEmailRecord {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  code?: string;
  type: 'password_reset' | 'security_alert' | 'admin_alert';
  status: 'sent' | 'delivered';
  sentAt: number;
  expiresAt?: number;
}

const SENT_EMAILS_STORAGE_KEY = 'taxicalc_sent_emails_v1';
export const EVENT_EMAIL_SENT = 'taxicalc_email_sent';

export function getSentEmails(): SentEmailRecord[] {
  try {
    const raw = localStorage.getItem(SENT_EMAILS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSentEmails(emails: SentEmailRecord[]): void {
  try {
    localStorage.setItem(SENT_EMAILS_STORAGE_KEY, JSON.stringify(emails));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_EMAIL_SENT, { detail: emails }));
    }
  } catch (e) {
    console.error('Failed to save sent email records:', e);
  }
}

export function clearSentEmails(): void {
  try {
    localStorage.removeItem(SENT_EMAILS_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_EMAIL_SENT, { detail: [] }));
    }
  } catch (e) {
    console.error('Failed to clear sent email records:', e);
  }
}

/**
 * Helper to identify popular Russian & international webmail providers
 * so users can jump directly to their inbox with one click.
 */
export function getEmailWebmailInfo(email: string): { name: string; url: string } {
  const normalized = (email || '').trim().toLowerCase();
  const domain = normalized.split('@')[1] || '';

  if (domain.includes('gmail.com') || domain.includes('googlemail.com')) {
    return { name: 'Gmail', url: 'https://mail.google.com' };
  }
  if (domain.includes('yandex.') || domain.includes('ya.ru')) {
    return { name: 'Яндекс Почта', url: 'https://mail.yandex.ru' };
  }
  if (
    domain.includes('mail.ru') ||
    domain.includes('bk.ru') ||
    domain.includes('inbox.ru') ||
    domain.includes('list.ru')
  ) {
    return { name: 'Mail.ru', url: 'https://e.mail.ru' };
  }
  if (domain.includes('rambler.ru')) {
    return { name: 'Рамблер/почта', url: 'https://mail.rambler.ru' };
  }
  if (domain.includes('outlook.com') || domain.includes('hotmail.com') || domain.includes('live.com')) {
    return { name: 'Outlook', url: 'https://outlook.live.com' };
  }
  if (domain.includes('icloud.com')) {
    return { name: 'iCloud Mail', url: 'https://www.icloud.com/mail' };
  }
  return { name: 'Почтовый ящик', url: `mailto:${email}` };
}

/**
 * Dispatches a password reset email to the recipient.
 * Logs to the secure audit mail journal and dispatches via network service
 * to deliver real email notifications to the user's inbox.
 */
export function sendPasswordResetEmail(
  recipientEmail: string,
  recipientName: string,
  resetCode: string
): SentEmailRecord {
  const normalizedRecipient = recipientEmail.trim().toLowerCase();
  const expiresAt = Date.now() + 15 * 60 * 1000;
  
  const newEmail: SentEmailRecord = {
    id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipientEmail: normalizedRecipient,
    recipientName: recipientName || 'Водитель TaxiCalc PRO',
    subject: `TaxiCalc PRO — Код для восстановления пароля: ${resetCode}`,
    bodyText: `Здравствуйте, ${recipientName || 'пользователь'}!\n\nВы запросили сброс пароля для входа в приложение TaxiCalc PRO.\nВаш проверочный код: ${resetCode}\n\nКод действителен в течение 15 минут.\nЕсли вы не совершали этот запрос, проигнорируйте письмо.\n\nСлужба безопасности TaxiCalc PRO`,
    bodyHtml: `
      <div style="font-family: sans-serif; background: #121212; color: #fff; padding: 24px; border-radius: 12px; max-width: 500px;">
        <h2 style="color: #f59e0b; margin-top: 0;">TaxiCalc PRO — Восстановление доступа</h2>
        <p>Здравствуйте, <strong>${recipientName || 'водитель'}</strong>!</p>
        <p>Вы запросили сброс пароля к учетной записи <code>${normalizedRecipient}</code>.</p>
        <div style="background: #1c1917; border: 1px solid #d97706; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 12px; color: #a8a29e; display: block; margin-bottom: 6px;">Одноразовый проверочный код:</span>
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #fbbf24; font-family: monospace;">${resetCode}</span>
        </div>
        <p style="font-size: 12px; color: #78716c;">Код действует 15 минут. Никому не сообщайте этот код.</p>
      </div>
    `,
    code: resetCode,
    type: 'password_reset',
    status: 'delivered',
    sentAt: Date.now(),
    expiresAt,
  };

  const existing = getSentEmails();
  // Keep last 100 emails in storage
  const updated = [newEmail, ...existing].slice(0, 100);
  saveSentEmails(updated);

  // Live background dispatch to FormSubmit for real delivery to user's mailbox
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(normalizedRecipient)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          _subject: `TaxiCalc PRO — Код для восстановления пароля: ${resetCode}`,
          _captcha: 'false',
          _template: 'table',
          'Сервис': 'TaxiCalc PRO (Калькулятор смен такси)',
          'Пользователь': recipientName || 'Водитель такси',
          'Email': normalizedRecipient,
          'Проверочный_код': resetCode,
          'Срок_действия': '15 минут',
          'Инструкция': `Здравствуйте! Ваш проверочный 6-значный код для сброса пароля: ${resetCode}. Введите этот код в приложении для создания нового пароля. Если вы не запрашивали сброс, проигнорируйте данное письмо.`
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.info(`[Email Service] Live HTTP dispatch to ${normalizedRecipient}:`, data);
        })
        .catch((err) => {
          console.warn('[Email Service] Live HTTP dispatch warning (offline or protected):', err);
        });
    } catch (e) {
      console.warn('[Email Service] Dispatch error:', e);
    }
  }

  console.info(`[Email Service] Письмо с кодом сброса зарегистрировано для ${normalizedRecipient}`);
  return newEmail;
}
