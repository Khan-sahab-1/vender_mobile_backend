import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Attached to request.user
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      partnerId: payload.partnerId,
      companyId: payload.companyId,
      company: payload.company,
      userType: payload.userType,
      isAdmin: Boolean(payload.isAdmin),
      accessRights: payload.accessRights,
      isVendor: payload.isVendor,
    };
  }
}
