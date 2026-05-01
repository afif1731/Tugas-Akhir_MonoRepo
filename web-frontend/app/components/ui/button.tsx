import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import React, { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'shadow-xs',
        outline: 'border bg-transparent shadow-xs',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:text-accent-foreground',
        link: 'underline-offset-4 hover:underline',
      },
      colors: {
        default: '',
        'teal-400': '',
        'teal-800': '',
        destructive: '',
      },
      size: {
        default: 'h-10 rounded-md px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: cn(
          'h-9 rounded-md px-4 has-[>svg]:px-3 max-md:py-2',
          'md:h-10 md:px-6 md:has-[>svg]:px-4'
        ),
        icon: 'size-10 rounded-full shrink-0',
      },
    },
    compoundVariants: [
      {
        variant: 'default',
        colors: 'default',
        className: 'bg-primary text-primary-foreground hover:bg-primary/90',
      },
      {
        variant: 'default',
        colors: 'teal-400',
        className: 'bg-teal-400 text-teal-950 hover:bg-teal-400/90',
      },
      {
        variant: 'default',
        colors: 'teal-800',
        className: 'bg-teal-800 text-white hover:bg-teal-800/90',
      },
      {
        variant: 'default',
        colors: 'destructive',
        className:
          'bg-destructive text-teal-950 hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
      },
      {
        variant: 'outline',
        colors: 'default',
        className: 'border-input hover:bg-accent hover:text-accent-foreground',
      },
      {
        variant: 'outline',
        colors: 'teal-400',
        className:
          'border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-teal-950 focus-visible:ring-teal-400/20',
      },
      {
        variant: 'outline',
        colors: 'teal-800',
        className:
          'border-teal-800 text-teal-800 hover:bg-teal-800 hover:text-white focus-visible:ring-teal-800/20',
      },
      {
        variant: 'outline',
        colors: 'destructive',
        className:
          'border-destructive text-destructive hover:bg-destructive hover:text-teal-950 focus-visible:ring-destructive/20',
      },
      {
        variant: 'ghost',
        colors: 'default',
        className: 'hover:bg-accent',
      },
      {
        variant: 'ghost',
        colors: 'teal-400',
        className: 'text-teal-400 hover:bg-teal-400/10',
      },
      {
        variant: 'ghost',
        colors: 'teal-800',
        className: 'text-teal-800 hover:bg-teal-800/10',
      },
      {
        variant: 'ghost',
        colors: 'destructive',
        className: 'text-destructive hover:bg-destructive/10',
      },
      {
        variant: 'link',
        colors: 'default',
        className: 'text-primary',
      },
      {
        variant: 'link',
        colors: 'teal-400',
        className: 'text-teal-400',
      },
      {
        variant: 'link',
        colors: 'teal-800',
        className: 'text-teal-800',
      },
    ],
    defaultVariants: {
      variant: 'default',
      colors: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      colors,
      asChild = false,
      leftIcon,
      rightIcon,
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, colors, className }))}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" />}
        {!isLoading && leftIcon}
        <Slottable>{children}</Slottable>
        {!isLoading && rightIcon}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };