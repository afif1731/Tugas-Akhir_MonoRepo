/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

import { logger } from '@bogeychan/elysia-logger';
import cors from '@elysiajs/cors';
import { env } from '@yolk-oss/elysia-env';
import { Elysia, t } from 'elysia';
import { StatusCodes } from 'http-status-codes';

import { ApiRouter } from './api/router';
import {
  databasePool as databasePool,
  ErrorResponse,
  LoggerConfig,
  prisma,
  SuccessResponse,
} from './common';
import { systemCronjobs } from './utils';

const nodeEnv = process.env['NODE_ENV'] || 'development';
const loggerConfig = LoggerConfig[nodeEnv] || LoggerConfig.development;

const uploadFileFolder = process.env.FILE_STORAGE_PATH || 'uploads';

(async () => {
  if (!existsSync(uploadFileFolder)) {
    await mkdir(uploadFileFolder, { recursive: true });
    console.log(`Upload Folder created in path ${uploadFileFolder}`);
  }
})();

const app = new Elysia({
  serve: {
    maxRequestBodySize: 1024 * 1024 * 30,
  },
})
  .use(
    logger({
      level: loggerConfig.level,
      transport: loggerConfig.transport,
      autoLogging: false,
      ...loggerConfig,
    }),
  )
  .use(
    cors({
      credentials: true,
      maxAge: 86_400,
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    }),
  )
  .use(
    env({
      NODE_ENV: t.Enum(
        {
          development: 'development',
          production: 'production',
          test: 'test',
        },
        { default: 'development' },
      ),
      BACKEND_PORT: t.String({
        minLength: 1,
        error: 'BACKEND_PORT is required',
      }),
      LIVEKIT_HTTP_URL: t.String({
        minLength: 1,
        error: 'LIVEKIT_HTTP_URL is required',
      }),
      CLIENT_ORIGIN: t.String({ default: '*' }),
      JWT_ACCESS_SECRET: t.String({
        minLength: 1,
        error: 'JWT_ACCESS_SECRET is required',
      }),
      JWT_REFRESH_SECRET: t.String({
        default: 'super-secret-string',
      }),
      DATABASE_URL: t.String({
        minLength: 1,
        error: 'DATABASE_URL is required',
      }),
      REDIS_URL: t.String({ default: 'redis://localhost:6379' }),
      FE_URL: t.String({ minLength: 1, error: 'FE_URL is required' }),
    }),
  )
  .use(systemCronjobs)
  .error({ ErrorResponse })
  .onAfterHandle(({ set, response, log, request, store }) => {
    if (nodeEnv === 'production' && response instanceof SuccessResponse) {
      const responseTime =
        performance.now() - ((store as any).__startTime || 0);

      log.info({
        type: 'response',
        statusCode: response.statusCode,
        method: request.method,
        path: new URL(request.url).pathname,
        responseTime: Math.round(responseTime * 100) / 100,
      });
    }

    if (response instanceof SuccessResponse) {
      set.status = response.statusCode;

      return JSON.stringify(response.json());
    }
  })
  .onError(({ code, set, error, log, request }) => {
    const isProduction = nodeEnv === 'production';

    if (
      ((error as any).message as string).includes('no such file or directory')
    ) {
      log?.warn({
        type: 'error',
        code: 404,
        message: 'File not found',
        method: request.method,
        path: new URL(request.url).pathname,
      });

      set.status = 404;

      return {
        success: false,
        statusCode: 404,
        message: 'File not found',
      };
    }

    if (error instanceof ErrorResponse) {
      log?.error({
        type: 'error',
        code: error.code,
        message: error.message,
        method: request.method,
        path: new URL(request.url).pathname,
        stack: error.stack,
      });

      set.status = error.code;

      return {
        success: false,
        statusCode: error.code,
        message: error.message,
      };
    }

    switch (code) {
      case 'NOT_FOUND': {
        set.status = 404;

        return {
          success: false,
          statusCode: 404,
          message: 'Endpoint not found',
        };
      }

      case 'VALIDATION': {
        const validationErrors = error.all.map((data: any) => ({
          path: data?.path,
          value: data?.value,
          message: data?.schema?.error || data?.message,
        }));

        if (isProduction) {
          log?.warn({
            type: 'error',
            code: 'VALIDATION',
            message: 'Validation error',
            method: request.method,
            path: new URL(request.url).pathname,
            errorCount: validationErrors.length,
          });
        } else {
          log?.warn({
            type: 'error',
            code: 'VALIDATION',
            message: 'Validation error',
            method: request.method,
            path: new URL(request.url).pathname,
            errors: validationErrors,
          });
        }

        set.status = 422;

        return {
          success: false,
          statusCode: 422,
          message: validationErrors,
        };
      }

      default: {
        const errorMessage =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Unknown error';
        const errorStack =
          error && typeof error === 'object' && 'stack' in error
            ? String(error.stack)
            : undefined;

        log?.error({
          type: 'error',
          code: code || 'UNKNOWN',
          message: errorMessage,
          method: request.method,
          path: new URL(request.url).pathname,
          stack: errorStack,
        });

        set.status = 500;

        return {
          success: false,
          statusCode: 500,
          message:
            process.env['NODE_ENV'] === 'production'
              ? 'Internal server error'
              : errorMessage,
        };
      }
    }
  })
  .get('/uploads/*', async ({ params, set }) => {
    const path = `${uploadFileFolder}/${params['*']}`;
    const file = Bun.file(path);

    const isExists = await file.exists();

    if (!isExists) {
      set.status = 404;

      return {
        success: false,
        statusCode: 404,
        message: 'File tidak dapat ditemukan',
      };
    }

    set.status = 200;

    return file;
  })
  .get('/health-check', () => ({
    success: true,
    statusCode: StatusCodes.OK,
    message: `Current Time: ${new Date()}`, // eslint-disable-line @typescript-eslint/restrict-template-expressions
  }))
  .group('/api', app => app.use(ApiRouter))
  .onStop(async () => {
    try {
      await prisma.$disconnect();
      await databasePool.end();
    } catch (error) {
      console.error('Failed to shutting down server.', error);
    }
  })
  .listen(process.env.BACKEND_PORT || 4000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

process.on('SIGINT', () => {
  app.stop();
});

process.on('SIGTERM', () => {
  app.stop();
});
