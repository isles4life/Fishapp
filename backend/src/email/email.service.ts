import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly client = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  private readonly from = process.env.SES_FROM_ADDRESS ?? 'noreply@fishleague.app';

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.SES_FROM_ADDRESS) {
      this.logger.warn(`SES_FROM_ADDRESS not set — skipping email to ${to}: ${subject}`);
      return;
    }
    try {
      await this.client.send(new SendEmailCommand({
        Source: this.from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: html } },
        },
      }));
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err: any) {
      // Never throw — email failure must not break the main flow
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }

  async sendSubmissionReceived(to: string, displayName: string, tournamentName: string): Promise<void> {
    await this.send(
      to,
      '🎣 Catch Received – FishLeague',
      `<p>Hi ${displayName},</p>
       <p>Your catch has been submitted to <strong>${tournamentName}</strong> and is pending review.</p>
       <p>You'll receive another email once a moderator reviews it.</p>
       <p>— The FishLeague Team</p>`,
    );
  }

  async sendSubmissionApproved(to: string, displayName: string, tournamentName: string, lengthCm: number): Promise<void> {
    await this.send(
      to,
      '✅ Catch Approved – FishLeague',
      `<p>Hi ${displayName},</p>
       <p>Great news! Your <strong>${lengthCm} cm</strong> catch in <strong>${tournamentName}</strong> has been <strong>approved</strong> and added to the leaderboard.</p>
       <p><a href="https://fishleague.app/leaderboard">View Leaderboard</a></p>
       <p>— The FishLeague Team</p>`,
    );
  }

  async sendSubmissionRejected(to: string, displayName: string, tournamentName: string, note?: string): Promise<void> {
    await this.send(
      to,
      '❌ Catch Not Approved – FishLeague',
      `<p>Hi ${displayName},</p>
       <p>Unfortunately your catch submission in <strong>${tournamentName}</strong> was not approved.</p>
       ${note ? `<p><strong>Reason:</strong> ${note}</p>` : ''}
       <p>If you have questions, please contact support.</p>
       <p>— The FishLeague Team</p>`,
    );
  }

  async sendAccountSuspended(to: string, displayName: string, note?: string): Promise<void> {
    await this.send(
      to,
      '⚠️ Account Suspended – FishLeague',
      `<p>Hi ${displayName},</p>
       <p>Your FishLeague account has been suspended.</p>
       ${note ? `<p><strong>Reason:</strong> ${note}</p>` : ''}
       <p>To appeal this decision, please contact support.</p>
       <p>— The FishLeague Team</p>`,
    );
  }
}
