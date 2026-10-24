import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'teal' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variants = {
    primary: 'bg-[var(--dt-primary)] text-white hover:brightness-110 rounded-[8px] shadow-sm',
    ghost: 'bg-transparent text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] hover:bg-[var(--dt-card)] rounded-[8px]',
    secondary: 'bg-[var(--dt-card)] text-[var(--dt-foreground)] border border-[var(--dt-border)] hover:bg-[var(--dt-background)] rounded-[8px]',
    teal: 'bg-[var(--dt-primary)] text-white hover:brightness-110 rounded-[8px] shadow-sm',
    danger: 'bg-[var(--dt-destructive)] text-white hover:brightness-110 rounded-[8px] shadow-sm',
  }

  const sizes = {
    sm: 'text-[12px] px-2.5 py-1 gap-1.5',
    md: 'text-[13px] px-3 py-1.5 gap-2',
    lg: 'text-[15px] px-4 py-2 gap-2.5',
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
