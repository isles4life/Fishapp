import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../common/prisma.service';
import { LeaderboardGateway } from '../websocket/leaderboard.gateway';
import { S3Service } from '../submissions/s3.service';

const mockPrisma = {
  submission: { findUnique: jest.fn() },
  leaderboardEntry: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  tournament: { update: jest.fn(), findUnique: jest.fn() },
};

const mockGateway = { broadcastLeaderboardUpdate: jest.fn() };
const mockS3 = { getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/photo.jpg') };

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LeaderboardGateway, useValue: mockGateway },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    jest.clearAllMocks();
  });

  it('should not update leaderboard if submission not found', async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(null);
    await service.onSubmissionApproved('non-existent-id');
    expect(mockPrisma.leaderboardEntry.upsert).not.toHaveBeenCalled();
  });

  it('should upsert leaderboard entry when submission approved and no existing entry', async () => {
    const submission = {
      id: 'sub-1',
      tournamentId: 'tourn-1',
      userId: 'user-1',
      fishLengthCm: 45.5,
      fishWeightOz: null,
      tournament: { scoringMethod: 'LENGTH' },
    };
    mockPrisma.submission.findUnique.mockResolvedValue(submission);
    mockPrisma.leaderboardEntry.findUnique.mockResolvedValue(null);
    mockPrisma.leaderboardEntry.upsert.mockResolvedValue({});
    mockPrisma.leaderboardEntry.findMany.mockResolvedValue([]);

    await service.onSubmissionApproved('sub-1');

    expect(mockPrisma.leaderboardEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ fishLengthCm: 45.5 }),
      }),
    );
    expect(mockGateway.broadcastLeaderboardUpdate).toHaveBeenCalled();
  });

  it('should not update entry if new fish is shorter than existing', async () => {
    const submission = {
      id: 'sub-2',
      tournamentId: 'tourn-1',
      userId: 'user-1',
      fishLengthCm: 30.0,
      fishWeightOz: null,
      tournament: { scoringMethod: 'LENGTH' },
    };
    mockPrisma.submission.findUnique.mockResolvedValue(submission);
    mockPrisma.leaderboardEntry.findUnique.mockResolvedValue({ fishLengthCm: 50.0 });
    mockPrisma.leaderboardEntry.findMany.mockResolvedValue([]);

    await service.onSubmissionApproved('sub-2');

    expect(mockPrisma.leaderboardEntry.upsert).not.toHaveBeenCalled();
  });

  it('getTop25 returns ranked entries', async () => {
    mockPrisma.tournament.findUnique.mockResolvedValue({ scoringMethod: 'LENGTH' });
    mockPrisma.leaderboardEntry.findMany.mockResolvedValue([
      { userId: 'u1', fishLengthCm: 60, score: 60, submissionId: 's1', user: { displayName: 'Alice', profile: null }, submission: { speciesName: null, speciesCategory: null, photo1Key: null, createdAt: new Date(), fishWeightOz: null, released: false } },
      { userId: 'u2', fishLengthCm: 50, score: 50, submissionId: 's2', user: { displayName: 'Bob', profile: null }, submission: { speciesName: null, speciesCategory: null, photo1Key: null, createdAt: new Date(), fishWeightOz: null, released: false } },
    ]);

    const result = await service.getTop25('tourn-1');
    expect(result[0].rank).toBe(1);
    expect(result[0].displayName).toBe('Alice');
    expect(result[1].rank).toBe(2);
  });
});
