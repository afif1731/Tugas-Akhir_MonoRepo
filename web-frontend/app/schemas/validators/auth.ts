import * as v from 'valibot';

export const EmailSchema = v.pipe(
  v.string(),
  v.nonEmpty('Email must not empty'),
  v.trim(),
  v.minLength(5),
  v.email('Invalid email address')
);

export const PasswordSchema = v.pipe(
  v.string(),
  v.nonEmpty('Password must not be empty'),
  v.minLength(8, 'Password too short'),
  v.maxLength(32, 'Password too long')
);
