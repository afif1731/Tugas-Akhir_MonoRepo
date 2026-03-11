export const JwtConfig = {
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'super-secret-code',
  JWT_ACCESS_EXPIRES_IN:
    Number.parseInt(process.env.JWT_ACCESS_EXPIRES_IN!) || 6 * 60 * 60 * 1000, // 6h

  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super-secret-code',
  JWT_REFRESH_EXPIRES_IN:
    Number.parseInt(process.env.JWT_REFRESH_EXPIRES_IN!) ||
    7 * 24 * 60 * 60 * 1000, // 7d

  JWT_MAIL_SECRET: process.env.JWT_MAIL_SECRET || 'super-secret-code',
  JWT_MAIL_EXPIRES_IN:
    Number.parseInt(process.env.JWT_MAIL_EXPIRES_IN!) || 24 * 60 * 60 * 1000, // 24h
};
