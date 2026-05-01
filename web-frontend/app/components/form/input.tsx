/** biome-ignore-all lint/suspicious/noExplicitAny: _ */
import type { ReactNode } from 'react';
import { type ControllerRenderProps, type FieldValues, useFormContext } from 'react-hook-form';

import { cn } from '@/lib/utils';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input, type InputProps } from '@/components/ui/input';

import type { FormClassnamesProps } from '@/schemas/types';

import { Text } from '../helper/text';
import { GridTimePicker } from '../shared/grid-time-picker';
import { PasswordInput } from '../ui/password-input';
import { TimeInput } from '../ui/time-input';

interface InputFormProps extends InputProps {
  name: string;
  type?: 'text' | 'number' | 'password' | 'time' | 'price';
  label?: string;
  placeholder?: string;
  description?: string | ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
  classNames?: FormClassnamesProps;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export default function InputForm({
  type = 'text',
  name,
  label,
  placeholder = '',
  description,
  className,
  classNames,
  isRequired = false,
  isDisabled = false,
  inputProps,
  ...props
}: InputFormProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const hasError = Boolean(errors[name]?.message);

  type Field = ControllerRenderProps<FieldValues, string>;

  function renderInput(field: Field) {
    let inputNode: React.ReactNode;

    switch (type) {
      case 'password':
        inputNode = (
          <PasswordInput
            placeholder={placeholder}
            disabled={isDisabled}
            className={cn(
              classNames?.content,
              hasError && 'border-destructive-500 focus-visible:ring-destructive-500',
              className
            )}
            {...field}
            {...props}
          />
        );
        break;
      case 'time':
        inputNode = (
          <TimeInput
            popoverContent={
              <GridTimePicker
                value={field.value || ''}
                onChange={(val) => {
                  field.onChange(val);
                }}
              />
            }
            isDisabled={isDisabled}
            type="time"
            placeholder={placeholder}
            disabled={isDisabled}
            className={cn(
              classNames?.content,
              hasError && 'border-destructive-500 focus-visible:ring-destructive-500',
              className
            )}
            {...field}
            {...inputProps}
            {...props}
          />
        );
        break;
      case 'number':
        inputNode = (
          <Input
            type="number"
            placeholder={placeholder}
            disabled={isDisabled}
            inputMode="decimal"
            onKeyDown={(e) => {
              const k = e.key;
              if (k === 'e' || k === 'E' || k === '+') e.preventDefault();
            }}
            onPaste={(e) => {
              const t = (e.clipboardData.getData('text') || '').replace(/[^\d.,-]/g, '');
              if (t !== e.clipboardData.getData('text')) e.preventDefault();
            }}
            className={cn(
              classNames?.content,
              hasError && 'border-destructive-500 focus-visible:ring-destructive-500',
              className
            )}
            {...field}
            {...inputProps}
            {...props}
          />
        );
        break;
      case 'price':
        inputNode = (
          <div className="relative">
            <Text
              type="btn"
              className="absolute top-5 left-3 -translate-y-1/2 text-muted-foreground"
            >
              Rp.
            </Text>
            <Input
              inputMode="numeric"
              placeholder={placeholder}
              disabled={isDisabled}
              className={cn(
                'pl-10',
                classNames?.content,
                hasError && 'border-destructive-500 focus-visible:ring-destructive-500',
                className
              )}
              value=""
              onChange={(e) => {
                const parsed = e.target.value.replace(/[^\d]/g, '');
                field.onChange(parsed);
              }}
              {...inputProps}
              {...props}
            />
          </div>
        );
        break;
      default:
        inputNode = (
          <Input
            type="text"
            placeholder={placeholder}
            disabled={isDisabled}
            className={cn(
              classNames?.content,
              hasError && 'border-destructive-500 focus-visible:ring-destructive-500',
              className
            )}
            {...field}
            {...inputProps}
            {...props}
          />
        );
        break;
    }
    return inputNode;
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('text-start', classNames?.wrapper)}>
          {label && (
            <FormLabel
              className={cn(
                'max-md:text-sm',
                isDisabled && 'text-slate-500',
                isRequired && 'after:-ml-1.5 after:text-destructive after:content-["*"]'
              )}
            >
              {label}
            </FormLabel>
          )}
          <FormControl>{renderInput(field)}</FormControl>
          {description && !hasError && (
            <FormDescription
              className={cn(
                'text-xs md:text-sm',
                hasError && 'text-destructive-400',
                isDisabled && 'text-slate-500'
              )}
            >
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
