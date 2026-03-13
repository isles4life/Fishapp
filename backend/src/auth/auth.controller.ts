import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';

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
