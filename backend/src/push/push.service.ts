import { Injectable, Logger } from '@nestjs/common';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async sendToToken(token: string, title: string, body: string, data?: Record<string, any>) {
    if (!isExpoPushToken(token)) {
      this.logger.warn(`Invalid Expo push token: ${token}`);
      return;
    }
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ to: token, title, body, data, sound: 'default' }),
      });
      const json = await res.json() as any;
      if (json?.data?.status === 'error') {
        this.logger.warn(`Push failed: ${json.data.message}`);
      }
    } catch (err) {
      this.logger.error('Push notification error', err);
    }
  }
}
