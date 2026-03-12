import { type Role } from '@prisma/client';
import { password } from 'bun';
import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, prisma } from '@/common';
import { AdditionalValidation, FileManager } from '@/utils';

import {
  type IGetMeDetailResponse,
  type IUpdateMeDetailRequest,
} from './schema';

export abstract class AuthMeService {
  static async getMeDetail(user_id: string): Promise<IGetMeDetailResponse> {
    const isUserExist = await prisma.users.findUnique({
      where: { id: user_id },
      omit: {
        password: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'User not found');

    return isUserExist;
  }

  static async updateMeDetail(
    user_id: string,
    data: IUpdateMeDetailRequest,
  ): Promise<IGetMeDetailResponse> {
    if (data.profile_picture)
      AdditionalValidation.isImageValid(data.profile_picture);

    if (data.password) {
      if (!data.old_password)
        throw new ErrorResponse(
          StatusCodes.UNPROCESSABLE_ENTITY,
          'Old password required',
        );
      if (!data.confirm_password)
        throw new ErrorResponse(
          StatusCodes.UNPROCESSABLE_ENTITY,
          'Confirm password required',
        );

      AdditionalValidation.isPasswordValid(
        data.password,
        data.confirm_password,
      );
    }

    const isUserExist = await prisma.users.findUnique({
      where: { id: user_id },
      select: { id: true, password: true, profile_picture: true },
    });

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'User not found');

    let hashedNewPassword: string | undefined;
    let profilePicturePath: string | undefined;

    if (data.password) {
      const isOldPasswordMatch = password.verifySync(
        data.old_password!,
        isUserExist.password,
        'bcrypt',
      );
      if (!isOldPasswordMatch)
        throw new ErrorResponse(StatusCodes.BAD_REQUEST, 'Invalid password.');

      hashedNewPassword = await password.hash(data.password, 'bcrypt');
    }

    if (data.profile_picture)
      profilePicturePath = await FileManager.upload(
        'profile-pictures',
        data.profile_picture,
      );

    const updatedUser = await prisma.users.update({
      where: { id: isUserExist.id },
      data: {
        name: data.name,
        password: hashedNewPassword,
        wa_number: data.wa_number,
        telegram_username: data.telegram_username,
        profile_picture: profilePicturePath,
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

  static async deleteMe(user_id: string, user_role: Role): Promise<void> {
    const [isUserExist, adminCount] = await prisma.$transaction([
      prisma.users.findUnique({
        where: { id: user_id },
        select: { id: true, role: true, profile_picture: true },
      }),
      prisma.users.count({ where: { role: 'ADMIN' } }),
    ]);

    if (!isUserExist)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'User not found');

    if (user_role === 'ADMIN' && adminCount === 1)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'Only one admin exist, cannot delete this user',
      );

    await prisma.users.delete({ where: { id: isUserExist.id } });

    await FileManager.remove(isUserExist.profile_picture);

    return;
  }
}
