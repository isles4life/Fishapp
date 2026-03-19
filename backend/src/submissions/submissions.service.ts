import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { S3Service } from './s3.service';
import { EmailService } from '../email/email.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly email: EmailService,
  ) {}

  async create(
    userId: string,
    dto: CreateSubmissionDto,
    photo1: Buffer | null,
    photo2: Buffer,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.suspended) throw new ForbiddenException('Account suspended');

    // 1. Validate tournament exists and is open
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: dto.tournamentId },
      include: { region: true },
    });
    if (!tournament || !tournament.isOpen) {
      throw new BadRequestException('Tournament is not active');
    }

    const now = new Date();
    if (now < tournament.startsAt || now > tournament.endsAt) {
      throw new BadRequestException('Submission outside tournament window');
    }

    // 2. Validate GPS inside tournament's region bounding box
    const region = tournament.region;
    const { gpsLat, gpsLng } = dto;
    if (
      gpsLat < region.minLat ||
      gpsLat > region.maxLat ||
      gpsLng < region.minLng ||
      gpsLng > region.maxLng
    ) {
      throw new BadRequestException('GPS location outside tournament region');
    }

    // 3. Validate mat serial (QR code) — optional for mat-free submissions
    let matSerial: { id: string; isActive: boolean } | null = null;
    if (dto.matSerialCode) {
      matSerial = await this.prisma.matSerial.findUnique({
        where: { serialCode: dto.matSerialCode },
      });
      if (!matSerial || !matSerial.isActive) {
        throw new BadRequestException('Invalid mat serial');
      }

      // 4. Prevent QR reuse across accounts for this tournament
      const qrAlreadyUsed = await this.prisma.submission.findFirst({
        where: {
          matSerialId: matSerial.id,
          tournamentId: dto.tournamentId,
          userId: { not: userId },
        },
      });
      if (qrAlreadyUsed) {
        throw new BadRequestException('Mat QR already used by another angler');
      }
    }

    // 5. Compute image hashes
    const hash1 = photo1 ? this.s3.md5Hash(photo1) : null;
    const hash2 = this.s3.md5Hash(photo2);

    // 6. Check duplicate image hashes in this tournament
    const dupHash = await this.prisma.submission.findFirst({
      where: {
        tournamentId: dto.tournamentId,
        OR: [
          ...(hash1 ? [{ imageHash1: hash1 }] : []),
          { imageHash2: hash2 },
        ],
      },
    });

    // 7. Check repeated GPS (flag if same exact coords used 3+ times)
    const gpsCount = await this.prisma.submission.count({
      where: {
        tournamentId: dto.tournamentId,
        gpsLat: dto.gpsLat,
        gpsLng: dto.gpsLng,
      },
    });

    // 8. Upload to S3
    const submissionId = uuid();
    const photo1Key = photo1 ? `submissions/${submissionId}/photo1.jpg` : null;
    const photo2Key = `submissions/${submissionId}/photo2.jpg`;

    const uploads = [this.s3.uploadBuffer(photo2Key, photo2, 'image/jpeg')];
    if (photo1 && photo1Key) uploads.push(this.s3.uploadBuffer(photo1Key, photo1, 'image/jpeg'));
    await Promise.all(uploads);

    // 9. Persist submission
    const submission = await this.prisma.submission.create({
      data: {
        id: submissionId,
        userId,
        tournamentId: dto.tournamentId,
        matSerialId: matSerial?.id ?? null,
        fishLengthCm: dto.fishLengthCm,
        gpsLat: dto.gpsLat,
        gpsLng: dto.gpsLng,
        capturedAt: new Date(dto.capturedAt),
        photo1Key: photo1Key ?? undefined,
        photo2Key,
        imageHash1: hash1 ?? undefined,
        imageHash2: hash2,
        flagDuplicateHash: !!dupHash,
        flagDuplicateGps: gpsCount >= 2,
        status: 'PENDING',
        speciesName: dto.speciesName,
        speciesCategory: dto.speciesCategory,
        released: dto.released ?? false,
      },
    });

    // Fire-and-forget confirmation email
    this.email.sendSubmissionReceived(user.email, user.displayName, tournament.name);

    // Fire-and-forget AI fraud checks
    this.checkIsFish(photo2, submission.id);
    this.estimateFishLength(photo2, submission.id, dto.fishLengthCm);

    return { submissionId: submission.id, status: 'PENDING' };
  }

  private async checkIsFish(photoBuffer: Buffer, submissionId: string): Promise<void> {
    try {
      const blob = new Blob([new Uint8Array(photoBuffer)], { type: 'image/jpeg' });
      const form = new FormData();
      form.append('image', blob, 'fish.jpg');

      const res = await fetch('https://api.inaturalist.org/v1/computervision/score_image', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) return;

      const data: any = await res.json();
      const fishResults = (data.results ?? []).filter(
        (r: any) => r.taxon?.iconic_taxon_name === 'Actinopterygii',
      );

      // Flag if no fish detected at all, or top fish confidence is very low
      const topFishScore = fishResults[0]?.combined_score ?? 0;
      const suspect = fishResults.length === 0 || topFishScore < 0.15;

      if (suspect) {
        await this.prisma.submission.update({
          where: { id: submissionId },
          data: { flagSuspectPhoto: true },
        });
      }
    } catch {
      // Never fail the submission over a fraud check
    }
  }

  private async estimateFishLength(
    photoBuffer: Buffer,
    submissionId: string,
    submittedLengthCm: number,
  ): Promise<void> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    try {
      const base64 = photoBuffer.toString('base64');
      const body = {
        contents: [{
          parts: [
            {
              inline_data: { mime_type: 'image/jpeg', data: base64 },
            },
            {
              text: `This photo shows a fish on a measuring surface. There may be a measuring mat with ruler markings along the side, or a separate ruler or tape measure placed next to the fish. Using any visible measurement markings (mat ruler or standalone ruler), estimate the fish's total length in inches from tip of mouth to tip of tail. Respond with ONLY a single number in inches (e.g. "14.5") or the word "unknown" if you cannot clearly determine the length.`,
            },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 16 },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      if (!res.ok) return;

      const data: any = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      const estimatedIn = parseFloat(raw);
      if (isNaN(estimatedIn) || estimatedIn <= 0) return;

      const estimatedCm = estimatedIn * 2.54;
      const discrepancy = Math.abs(estimatedCm - submittedLengthCm) / submittedLengthCm;

      // Flag if AI estimate differs by more than 30% from submitted length
      const suspect = discrepancy > 0.30;

      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          estimatedLengthCm: estimatedCm,
          ...(suspect ? { flagSuspectLength: true } : {}),
        },
      });
    } catch {
      // Never fail the submission over a length estimate
    }
  }

  async getMySubmissions(userId: string, tournamentId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { userId, tournamentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        fishLengthCm: true,
        capturedAt: true,
        createdAt: true,
        released: true,
        moderationActions: {
          where: { actionType: 'REJECT' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { note: true },
        },
      },
    });

    return submissions.map(s => ({
      id: s.id,
      status: s.status,
      fishLengthCm: s.fishLengthCm,
      capturedAt: s.capturedAt,
      createdAt: s.createdAt,
      rejectionNote: s.moderationActions[0]?.note ?? null,
      released: s.released,
    }));
  }

  async getHotSpots(tournamentId?: string) {
    const submissions = await this.prisma.submission.findMany({
      where: {
        status: 'APPROVED',
        ...(tournamentId ? { tournamentId } : {}),
      },
      select: {
        gpsLat: true,
        gpsLng: true,
        speciesName: true,
        fishLengthCm: true,
      },
    });
    return submissions.map(s => ({
      lat: s.gpsLat,
      lng: s.gpsLng,
      species: s.speciesName ?? 'Unknown',
      lengthCm: s.fishLengthCm,
    }));
  }
}
