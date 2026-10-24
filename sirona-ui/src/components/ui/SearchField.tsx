import React from 'react'
import { Search } from 'lucide-react'

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string
}

export const SearchField: React.FC<SearchFieldProps> = ({
  placeholder = 'Search or jump to... (Cmd+K)',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-2.5 w-3.5 h-3.5 text-[var(--dt-muted-foreground)] pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 text-[12px] text-[var(--dt-foreground)] bg-[var(--dt-background)] border border-[var(--dt-border)] rounded-[8px] focus:outline-none focus:border-[var(--dt-primary)] focus:ring-1 focus:ring-[var(--dt-primary)] transition-all placeholder:text-[var(--dt-muted-foreground)] font-normal shadow-xs"
        {...props}
      />
    </div>
  )
}
