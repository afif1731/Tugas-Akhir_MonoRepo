/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { type LoggerOptions, pino } from 'pino';

const commonOptions: LoggerOptions = {
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'request.headers.authorization',
      'request.headers.cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'env',
      'set.headers',
      'store',
      'qi',
      'query',
      'response',
      'responseValue',
      'log',
      'isError',
    ],
    censor: '[REDACTED]',
  },
};

export const LoggerConfig: Record<string, LoggerOptions> = {
  development: {
    ...commonOptions,
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          level: 'debug',
          options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      ],
    },
    level: 'debug',
  },
  production: {
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    serializers: {
      request: (request: any) => ({
        method: request.method,
        url: request.url,
        referer: request.headers?.get?.('referer') || request.headers?.referer,
      }),
      error: (error: any) => ({
        type: error.type,
        message: error.message,
        stack: error.stack,
        code: error.code,
      }),
    },
    base: null,
    redact: {
      paths: [
        'request.headers.authorization',
        'request.headers.cookie',
        'password',
        'token',
        'accessToken',
        'refreshToken',
      ],
      censor: '[REDACTED]',
    },
  },
};

export const logger = pino(LoggerConfig[process.env.NODE_ENV || 'development']);
