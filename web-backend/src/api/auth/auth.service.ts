import { password } from 'bun';
import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, JwtConfig, prisma } from '@/common';
import { AdditionalValidation, JwtUtils } from '@/utils';

import {
  type ILoginRequest,
  type ILoginResponse,
  type IRegisterRequest,
  type IUserProfileResponse,
} from './schema';

export abstract class AuthService {
  static async loginService(
    data: ILoginRequest,
    refresh_token?: string,
  ): Promise<ILoginResponse> {
    const isUserExist = await prisma.users.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
      },
    });

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'Email not registered.');

    const isPasswordMatch = await password.verify(
      data.password,
      isUserExist.password,
      'bcrypt',
    );
    if (!isPasswordMatch)
      throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'Invalid password.');

    const refreshTokenExpireDate = new Date(
      Date.now() + JwtConfig.JWT_REFRESH_EXPIRES_IN,
    );

    const tokens = JwtUtils.signTokens({
      email: isUserExist.email,
      role: isUserExist.role,
      user_id: isUserExist.id,
    });

    if (refresh_token) {
      const isRefreshTokenExist = await prisma.refreshTokens.findFirst({
        where: { AND: [{ refresh_token }, { id: isUserExist.id }] },
        select: { id: true },
      });

      if (isRefreshTokenExist)
        await prisma.refreshTokens.delete({
          where: { id: isRefreshTokenExist.id },
        });
    }

    await prisma.refreshTokens.create({
      data: {
        user_id: isUserExist.id,
        refresh_token: tokens.refresh_token,
        expired_at: refreshTokenExpireDate,
      },
    });

    return {
      ...tokens,
      user: {
        id: isUserExist.id,
        name: isUserExist.name,
        role: isUserExist.role,
      },
    };
  }

  static async registerService(
    data: IRegisterRequest,
    is_disabled: boolean = false,
  ): Promise<void> {
    if (is_disabled)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'This endpoint is being disabled',
      );

    AdditionalValidation.isPasswordValid(data.password, data.confirm_password);

    const isUserExist = await prisma.users.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (isUserExist)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Email is already registered.',
      );

    const hashedPassword = await password.hash(data.password, 'bcrypt');

    await prisma.users.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
      },
    });
  }

  static async refreshToken(
    refresh_token?: string,
  ): Promise<Omit<ILoginResponse, 'user'>> {
    const today = new Date();

    if (!refresh_token)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Refresh token required',
      );

    const jwtPayload = JwtUtils.verifyToken(refresh_token, 'REFRESH');

    if (!jwtPayload)
      throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'Invalid token');

    const isUserExist = await prisma.users.findUnique({
      where: { id: jwtPayload.user_id },
      select: {
        id: true,
        email: true,
        role: true,
        refresh_tokens: {
          where: { refresh_token },
          select: { id: true, expired_at: true },
        },
      },
    });

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'User not found');

    const currentRefreshToken = isUserExist.refresh_tokens[0];

    if (!currentRefreshToken || currentRefreshToken.expired_at < today)
      throw new ErrorResponse(
        StatusCodes.UNAUTHORIZED,
        'Refresh token expired',
      );

    const refreshTokenExpireDate = new Date(
      Date.now() + JwtConfig.JWT_REFRESH_EXPIRES_IN,
    );

    const tokens = JwtUtils.signTokens({
      email: isUserExist.email,
      role: isUserExist.role,
      user_id: isUserExist.id,
    });

    await prisma.$transaction([
      prisma.refreshTokens.create({
        data: {
          user_id: isUserExist.id,
          refresh_token: tokens.refresh_token,
          expired_at: refreshTokenExpireDate,
        },
      }),
      prisma.refreshTokens.delete({
        where: { id: currentRefreshToken.id },
      }),
    ]);

    return tokens;
  }

  static async logoutService(refresh_token?: string): Promise<void> {
    if (!refresh_token) return;

    await prisma.refreshTokens.delete({
      where: { refresh_token },
    });

    return;
  }

  static async getUserDetail(user_id: string): Promise<IUserProfileResponse> {
    const isUserExist = await prisma.users.findUnique({
      where: { id: user_id },
    });

    if (!isUserExist)
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        `User with id ${user_id} not found.`,
      );

    return {
      id: isUserExist.id,
      name: isUserExist.name,
      email: isUserExist.email,
      role: isUserExist.role,
      created_at: isUserExist.created_at,
    };
  }
}
