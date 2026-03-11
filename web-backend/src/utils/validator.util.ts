import { StatusCodes } from 'http-status-codes';

import { ALLOWED_IMAGE_TYPE, ErrorResponse } from '@/common';

export abstract class AdditionalValidation {
  static isPhoneValid(phone_number: string): boolean {
    if (!isRegexValid(phone_number, /^(?:\+62|08)\d{8,13}$/))
      throw new ErrorResponse(
        StatusCodes.UNPROCESSABLE_ENTITY,
        "Phone number's length must be 10 - 15 characters and start with +62 or 08 with no space",
      );

    return true;
  }

  static isPasswordValid(password: string, confirm_password?: string) {
    if (
      !isRegexValid(
        password,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,32}$/,
      )
    )
      throw new ErrorResponse(
        StatusCodes.UNPROCESSABLE_ENTITY,
        'Password must be 8-32 characters and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol',
      );

    if (confirm_password && password !== confirm_password)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Password and Confirm password did not match',
      );

    return true;
  }

  static isImageValid(file: File) {
    if (!ALLOWED_IMAGE_TYPE.includes(file.type))
      throw new ErrorResponse(
        StatusCodes.UNPROCESSABLE_ENTITY,
        `Image ${file.name} must have jpeg, png, webp, or jpg extension`,
      );

    return true;
  }

  static isStringArray(text: string) {
    try {
      const textArray = JSON.parse(text) as string[];

      return textArray;
    } catch {
      throw new ErrorResponse(
        StatusCodes.UNPROCESSABLE_ENTITY,
        'String must be a stringified Array',
      );
    }
  }
}

function isRegexValid(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}
