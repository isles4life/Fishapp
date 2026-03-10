import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as appleSignin from 'apple-signin-auth';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
        // Store hashed password in a real app via a separate credentials table
        // For MVP simplicity, we attach it to a side field; extend schema if needed
      },
    });

    return { token: this.sign(user.id), userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.suspended) throw new UnauthorizedException('Account suspended');

    // NOTE: For full MVP add a UserCredentials table with hashed password
    // Simplified here – swap for real bcrypt.compare against stored hash
    return { token: this.sign(user.id), userId: user.id };
  }

  async appleLogin(dto: AppleLoginDto) {
    // Verify the Apple identity token
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

    if (user.suspended) throw new UnauthorizedException('Account suspended');

    return { token: this.sign(user.id), userId: user.id };
  }

  private sign(userId: string) {
    return this.jwt.sign({ sub: userId });
  }
}
