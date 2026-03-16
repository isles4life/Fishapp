import { Controller, Post, Body, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';

// Strict limit: 5 attempts per minute per IP to prevent brute force
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Headers('x-platform') platform?: string) {
    return this.authService.login(dto, platform);
  }

  @Post('apple')
  appleLogin(@Body() dto: AppleLoginDto, @Headers('x-platform') platform?: string) {
    return this.authService.appleLogin(dto, platform);
  }
}
