import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user ? { ...request.user } : {};
    const headerCompanyId = request.headers['x-company-id'];
    if (headerCompanyId) {
      user.companyId = headerCompanyId;
    }
    return user;
  },
);
