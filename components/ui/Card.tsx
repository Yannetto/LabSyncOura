import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm ${hover ? 'hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
