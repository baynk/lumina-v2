const TELEGRAM_API_BASE = 'https://api.telegram.org';

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type SendMessageOptions = {
  disable_web_page_preview?: boolean;
  reply_markup?: Record<string, unknown>;
  disable_notification?: boolean;
};

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }
  return token;
}

async function telegramRequest<T>(method: string, payload: Record<string, unknown>) {
  const token = getBotToken();
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json()) as TelegramResponse<T>;

  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API error (${response.status})`);
  }

  return data.result as T;
}

export async function sendMessage(chatId: number | string, text: string, options: SendMessageOptions = {}) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options,
  });
}

export async function setWebhook(url: string, secretToken: string) {
  return telegramRequest('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message'],
  });
}
