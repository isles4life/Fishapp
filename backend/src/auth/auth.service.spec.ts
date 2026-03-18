import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn().mockReturnValue('mock-token') };
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({ email: 'a@b.com', password: 'pass1234', displayName: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'new-user' });

      const result = await service.register({
        email: 'new@test.com',
        password: 'pass1234',
        displayName: 'Angler',
      });

      expect(result.token).toBe('mock-token');
      expect(result.userId).toBe('new-user');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for suspended user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', suspended: true, passwordHash: 'hash' });
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
