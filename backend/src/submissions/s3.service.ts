import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

@Injectable()
export class S3Service {
  private readonly client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-west-2',
    ...(process.env.AWS_ENDPOINT_URL
      ? { endpoint: process.env.AWS_ENDPOINT_URL, forcePathStyle: true }
      : {}),
  });
  private readonly bucket = process.env.S3_BUCKET ?? 'fishleague-submissions';

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // No ACL — bucket has Object Ownership: Bucket owner enforced (ACLs disabled)
      }),
    );
    return key;
  }

  /**
   * Resolve a stored profilePhotoUrl to a usable URL.
   * If it's already an https:// or http:// URL (legacy or external), return as-is.
   * If it's an S3 key (e.g. "avatars/userId.jpg"), generate a presigned URL.
   * Presigned URL generation is local HMAC signing — no network call.
   */
  async resolveProfilePhotoUrl(keyOrUrl: string | null | undefined): Promise<string | null> {
    if (!keyOrUrl) return null;
    if (keyOrUrl.startsWith('https://') || keyOrUrl.startsWith('http://')) return keyOrUrl;
    return this.getPresignedUrl(keyOrUrl, 3600).catch(() => null);
  }

  md5Hash(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  getPublicUrl(key: string): string {
    // S3_PUBLIC_URL overrides the SDK endpoint for browser-accessible URLs
    // (e.g. localhost:4566 instead of the internal Docker hostname localstack:4566)
    const base = process.env.S3_PUBLIC_URL ?? process.env.AWS_ENDPOINT_URL;
    if (base) {
      return `${base}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
