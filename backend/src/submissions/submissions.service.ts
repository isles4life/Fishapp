import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { S3Service } from './s3.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async create(
    userId: string,
    dto: CreateSubmissionDto,
    photo1: Buffer | null,
    photo2: Buffer,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { region: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.suspended) throw new ForbiddenException('Account suspended');

    // 1. Validate tournament exists and is open
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: dto.tournamentId },
    });
    if (!tournament || !tournament.isOpen) {
      throw new BadRequestException('Tournament is not active');
    }

    const now = new Date();
    if (now < tournament.startsAt || now > tournament.endsAt) {
      throw new BadRequestException('Submission outside tournament window');
    }

    if (tournament.regionId !== user.regionId) {
      throw new ForbiddenException('Tournament is not in your region');
    }

    // 2. Validate GPS inside region bounding box
    const region = user.region;
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
      },
    });

    return { submissionId: submission.id, status: 'PENDING' };
  }

  async getMySubmissions(userId: string, tournamentId: string) {
    return this.prisma.submission.findMany({
      where: { userId, tournamentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        fishLengthCm: true,
        capturedAt: true,
        createdAt: true,
      },
    });
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
