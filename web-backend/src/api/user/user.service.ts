import { password } from 'bun';
import { type Prisma, type Users } from 'generated/prisma/client';
import { StatusCodes } from 'http-status-codes';
import { validate as isValidUuid } from 'uuid';

import { ErrorResponse, type IPaginatedResult, prisma } from '@/common';
import { AdditionalValidation, FileManager, paginate } from '@/utils';

import { type IGetMeDetailResponse } from '../auth/auth-me/schema';
import {
  type ICreateUserRequest,
  type IUpdateUserRequest,
  type IUserPaginationQuery,
} from './schema';

export abstract class UserService {
  static async createNewUser(
    data: ICreateUserRequest,
  ): Promise<IGetMeDetailResponse> {
    AdditionalValidation.isPasswordValid(data.password, data.confirm_password);

    if (data.profile_picture)
      AdditionalValidation.isImageValid(data.profile_picture);

    const isUserExist = await prisma.users.findUnique({
      where: { email: data.email },
      select: { id: true },
    });

    if (isUserExist)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Email already registered',
      );

    const hashedPassword = await password.hash(data.password, 'bcrypt');

    let profilePicturePath: string | undefined;
    if (data.profile_picture)
      profilePicturePath = await FileManager.upload(
        'profile-pictures',
        data.profile_picture,
      );

    const newUser = await prisma.users.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        profile_picture: profilePicturePath,
      },
      omit: {
        created_at: true,
        updated_at: true,
        password: true,
      },
    });

    return newUser;
  }

  static async getUserList(
    query: IUserPaginationQuery,
  ): Promise<IPaginatedResult<Users>> {
    const args: {
      where: Prisma.UsersWhereInput;
      select: Prisma.UsersSelect;
      orderBy: Prisma.UsersOrderByWithRelationInput[];
    } = {
      where: {
        AND: [
          { role: query.role },
          {
            OR: [
              {
                id:
                  query.search && isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
              {
                name:
                  query.search && !isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
              {
                email:
                  query.search && !isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
              {
                wa_number:
                  query.search && !isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
              {
                telegram_username:
                  query.search && !isValidUuid(query.search)
                    ? { contains: query.search, mode: 'insensitive' }
                    : undefined,
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: !query.lite,
        profile_picture: !query.lite,
        wa_number: !query.lite,
        telegram_username: !query.lite,
        role: !query.lite,
      },
      orderBy: [
        { id: query.orderById },
        { name: query.orderByName },
        { role: 'asc' },
        { created_at: 'desc' },
      ],
    };

    const users = await paginate<Users, typeof args>(
      prisma.users,
      query.page,
      query.perPage,
      args,
    );

    return users;
  }

  static async getUserDetail(user_id: string): Promise<IGetMeDetailResponse> {
    const isUserExist = await prisma.users.findUnique({
      where: { id: user_id },
      omit: {
        created_at: true,
        updated_at: true,
        password: true,
      },
    });

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'User not found');

    return isUserExist;
  }

  static async updateUser(
    self_user_id: string,
    user_id: string,
    data: IUpdateUserRequest,
  ): Promise<IGetMeDetailResponse> {
    if (data.password) {
      if (!data.confirm_password)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Confirm password required',
        );
      AdditionalValidation.isPasswordValid(
        data.password,
        data.confirm_password,
      );
    }

    if (data.profile_picture)
      AdditionalValidation.isImageValid(data.profile_picture);

    const isUserExist = await prisma.users.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        profile_picture: true,
      },
    });

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'User not found');

    if (isUserExist.id === self_user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You cannot change your detail from this endpoint, use patch me instead',
      );

    let hashedNewPassword: string | undefined;
    let newProfilePicturePath: string | undefined;

    if (data.password)
      hashedNewPassword = await password.hash(data.password, 'bcrypt');

    if (data.profile_picture)
      newProfilePicturePath = await FileManager.upload(
        'profile-pictures',
        data.profile_picture,
      );

    const updatedUser = await prisma.users.update({
      where: { id: user_id },
      data: {
        name: data.name,
        email: data.email,
        wa_number: data.wa_number,
        telegram_username: data.telegram_username,
        password: hashedNewPassword,
        profile_picture: newProfilePicturePath,
      },
      omit: {
        password: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (data.profile_picture)
      await FileManager.remove(isUserExist.profile_picture);

    return updatedUser;
  }

  static async deleteUser(
    self_user_id: string,
    user_id: string,
  ): Promise<void> {
    if (self_user_id === user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You cannot delete yourself from this endpoint, use delete me instead',
      );

    const [isUserExist, adminCount] = await prisma.$transaction([
      prisma.users.findUnique({
        where: { id: user_id },
        select: { id: true, role: true, profile_picture: true },
      }),
      prisma.users.count({ where: { role: 'ADMIN' } }),
    ]);

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'User not found');
    if (isUserExist.role === 'ADMIN' && adminCount === 1)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'Only one admin exist, cannot delete this user',
      );

    await prisma.users.delete({ where: { id: user_id } });

    await FileManager.remove(isUserExist.profile_picture);

    return;
  }
}
