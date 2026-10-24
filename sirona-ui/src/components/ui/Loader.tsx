import React, { useEffect, useState } from 'react'

export const Loader: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % frames.length)
    }, 80)
    return () => clearInterval(timer)
  }, [])

  return (
    <span
      className={`font-mono text-[var(--dt-primary)] ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } inline-block animate-pulse select-none`}
    >
      {frames[index]}
    </span>
  )
}
