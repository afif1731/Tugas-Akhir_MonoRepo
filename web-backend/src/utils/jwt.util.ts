import { StatusCodes } from 'http-status-codes';
import jwt, { TokenExpiredError } from 'jsonwebtoken';

import { ErrorResponse, type IJwtPayload, JwtConfig } from '../common';

export const JwtUtils = {
  signTokens: (payload: IJwtPayload) => {
    const accessToken = jwt.sign(payload, JwtConfig.JWT_ACCESS_SECRET, {
      expiresIn: JwtConfig.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, JwtConfig.JWT_REFRESH_SECRET, {
      expiresIn: JwtConfig.JWT_REFRESH_EXPIRES_IN,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  },

  signActivationToken: (payload: IJwtPayload) =>
    jwt.sign(payload, JwtConfig.JWT_MAIL_SECRET, {
      expiresIn: JwtConfig.JWT_MAIL_EXPIRES_IN,
    }),

  verifyToken: (token: string, type: 'ACCESS' | 'REFRESH' | 'MAIL') => {
    try {
      switch (type) {
        case 'ACCESS': {
          return jwt.verify(token, JwtConfig.JWT_ACCESS_SECRET) as IJwtPayload;
        }

        case 'REFRESH': {
          return jwt.verify(token, JwtConfig.JWT_REFRESH_SECRET) as IJwtPayload;
        }

        case 'MAIL': {
          return jwt.verify(token, JwtConfig.JWT_MAIL_SECRET) as IJwtPayload;
        }
      }
    } catch (error) {
      if (error instanceof TokenExpiredError)
        throw new ErrorResponse(StatusCodes.UNAUTHORIZED, error.message);

      return;
    }
  },

  isRefreshTokenNotExpired: (refresh_token: string) => {
    try {
      const payload = jwt.verify(
        refresh_token,
        JwtConfig.JWT_ACCESS_SECRET,
      ) as IJwtPayload;

      if (payload) return true;

      return false;
    } catch {
      return false;
    }
  },
};
