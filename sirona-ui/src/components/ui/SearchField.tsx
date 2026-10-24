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
      <Search className="absolute left-3 w-3.5 h-3.5 text-[#72706b] pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-1.5 text-[13px] text-[#27251e] bg-[#fdfbfa] border border-[#d1d1cd] rounded-[12px] focus:outline-none focus:border-[#016a71] transition-colors placeholder:text-[#72706b] font-normal"
        {...props}
      />
    </div>
  )
}
