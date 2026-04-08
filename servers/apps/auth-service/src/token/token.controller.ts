import { Controller, Post, Body, HttpCode, HttpStatus, Delete, Req } from '@nestjs/common';
import { TokenService } from './token.service';
import { Request } from 'express';
import { IsString, IsNotEmpty } from 'class-validator';

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class IssueDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  role: string;
}


@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  /** Issue a new access + refresh token pair (called after successful login). */
  @Post('issue')
  issue(@Body() dto: IssueDto, @Req() req: Request) {
    return this.tokenService.issueTokens(dto.userId, dto.role, {
      ipAddress: req.ip,
    });
  }

  /** Refresh – rotate refresh token and get new access token. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.tokenService.refreshTokens(dto.refreshToken, { ipAddress: req.ip });
  }

  /** Logout all devices – revoke all refresh tokens. */
  @Delete('revoke-all')
  @HttpCode(HttpStatus.OK)
  revokeAll(@Body() dto: IssueDto) {
    return this.tokenService.revokeAll(dto.userId);
  }
}
