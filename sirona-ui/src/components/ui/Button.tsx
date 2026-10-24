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
    'inline-flex items-center justify-center font-normal transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variants = {
    // Filled Action Button: Ink (#27251e) background, Parchment (#faf8f5) text, 12px radius
    primary: 'bg-[#27251e] text-[#faf8f5] hover:bg-[#000000] rounded-[12px] shadow-[var(--shadow-subtle)]',
    
    // Ghost Button: Transparent background, Graphite (#72706b) text, 1px Warm Mist (#d1d1cd) border, 6px radius
    ghost: 'bg-transparent text-[#72706b] hover:text-[#27251e] border border-[#d1d1cd] hover:border-[#92918b] rounded-[6px]',
    
    // Low-emphasis secondary
    secondary: 'bg-[#fdfbfa] text-[#27251e] border border-[#d1d1cd] hover:bg-[#f5f3ef] rounded-[6px]',
    
    // Deep Teal Action Accent: #016a71 background, white text, 12px radius
    teal: 'bg-[#016a71] text-white hover:bg-[#01585e] rounded-[12px] shadow-[var(--shadow-subtle)]',

    danger: 'bg-[#ef4444] text-white hover:bg-[#dc2626] rounded-[6px]',
  }

  const sizes = {
    sm: 'text-[12px] px-2.5 py-1 gap-1.5',
    md: 'text-[14px] px-3 py-2 gap-2',
    lg: 'text-[16px] px-4 py-2.5 gap-2.5',
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
