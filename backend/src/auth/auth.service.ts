import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as appleSignin from 'apple-signin-auth';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        authProvider: 'EMAIL',
        regionId: dto.regionId,
        passwordHash,
      },
    });

    return { token: this.sign(user.id), userId: user.id };
  }

  async login(dto: LoginDto, platform?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.suspended) throw new UnauthorizedException('Your account has been suspended. Please contact admin@fishleague.app for assistance.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.auditService.log('USER_LOGIN', user.id, user.displayName, user.id, {
      authProvider: 'EMAIL',
      platform: platform ?? 'unknown',
      email: user.email,
    });

    return { token: this.sign(user.id), userId: user.id };
  }

  async appleLogin(dto: AppleLoginDto, platform?: string) {
    const payload = await appleSignin.verifyIdToken(dto.identityToken, {
      audience: process.env.APPLE_BUNDLE_ID,
      ignoreExpiration: false,
    });

    const appleId = payload.sub;

    let user = await this.prisma.user.findUnique({ where: { appleId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          appleId,
          displayName: dto.displayName ?? 'Angler',
          authProvider: 'APPLE',
          regionId: dto.regionId,
        },
      });
    }

    if (user.suspended) throw new UnauthorizedException('Your account has been suspended. Please contact admin@fishleague.app for assistance.');

    await this.auditService.log('USER_LOGIN', user.id, user.displayName, user.id, {
      authProvider: 'APPLE',
      platform: platform ?? 'mobile',
    });

    return { token: this.sign(user.id), userId: user.id };
  }

  private sign(userId: string) {
    return this.jwt.sign({ sub: userId });
  }
}
