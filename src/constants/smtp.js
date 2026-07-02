export const SMTP_PROVIDERS = {
  gmail: { label: 'Gmail', smtp_host: 'smtp.gmail.com', smtp_port: 587, encryption_type: 'TLS' },
  outlook365: { label: 'Outlook 365', smtp_host: 'smtp.office365.com', smtp_port: 587, encryption_type: 'TLS' },
  zoho: { label: 'Zoho Mail', smtp_host: 'smtp.zoho.com', smtp_port: 587, encryption_type: 'TLS' },
  amazon_ses: { label: 'Amazon SES', smtp_host: 'email-smtp.us-east-1.amazonaws.com', smtp_port: 587, encryption_type: 'TLS' },
  sendgrid: { label: 'SendGrid', smtp_host: 'smtp.sendgrid.net', smtp_port: 587, encryption_type: 'TLS' },
  custom: { label: 'Custom', smtp_host: '', smtp_port: 587, encryption_type: 'TLS' },
};

export const ENCRYPTION_TYPES = [
  { value: 'NONE', label: 'None' },
  { value: 'TLS', label: 'TLS' },
  { value: 'SSL', label: 'SSL' },
];

export function emptySmtpForm() {
  return {
    provider: 'gmail',
    sender_name: '',
    from_email: '',
    reply_to_email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    encryption_type: 'TLS',
    smtp_username: '',
    smtp_password: '',
    test_recipient: '',
  };
}

export function settingsToForm(settings) {
  if (!settings) return emptySmtpForm();
  return {
    provider: settings.provider || 'custom',
    sender_name: settings.sender_name || '',
    from_email: settings.from_email || '',
    reply_to_email: settings.reply_to_email || '',
    smtp_host: settings.smtp_host || '',
    smtp_port: String(settings.smtp_port || 587),
    encryption_type: settings.encryption_type || 'TLS',
    smtp_username: settings.smtp_username || '',
    smtp_password: '',
    test_recipient: '',
  };
}

export function statusLabel(lastTestStatus) {
  if (lastTestStatus === 'success') return { label: 'Connected', color: 'text-emerald-700 bg-emerald-50' };
  if (lastTestStatus === 'failed') return { label: 'Failed', color: 'text-red-700 bg-red-50' };
  return { label: 'Not Tested', color: 'text-slate-600 bg-slate-100' };
}
