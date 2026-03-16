import { Injectable, Logger } from '@nestjs/common';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class PushService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(PushService.name);

  async sendToToken(token: string, title: string, body: string, data?: Record<string, any>) {
    if (!Expo.isExpoPushToken(token)) {
      this.logger.warn(`Invalid Expo push token: ${token}`);
      return;
    }
    const message: ExpoPushMessage = { to: token, title, body, data, sound: 'default' };
    try {
      const [ticket] = await this.expo.sendPushNotificationsAsync([message]);
      if (ticket.status === 'error') {
        this.logger.warn(`Push failed: ${ticket.message}`);
      }
    } catch (err) {
      this.logger.error('Push notification error', err);
    }
  }
}
