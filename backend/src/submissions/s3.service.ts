import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

  async uploadBuffer(key: string, buffer: Buffer, contentType: string, isPublic = false): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ...(isPublic ? { ACL: 'public-read' } : {}),
      }),
    );
    return key;
  }

  md5Hash(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
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
