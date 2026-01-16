import React from 'react'

interface StatusBadgeProps {
  connected?: boolean
  status?: 'success' | 'error' | 'warning' | 'neutral'
  label?: string
  className?: string
}

export function StatusBadge({ 
  connected, 
  status, 
  label,
  className = '' 
}: StatusBadgeProps) {
  // Determine status from connected prop if status not provided
  const actualStatus = status || (connected ? 'success' : 'neutral')
  
  const statusConfig = {
    success: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
      defaultLabel: 'Connected'
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
      defaultLabel: 'Error'
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
      defaultLabel: 'Warning'
    },
    neutral: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-400',
      defaultLabel: 'Not Connected'
    }
  }
  
  const config = statusConfig[actualStatus]
  const displayLabel = label || config.defaultLabel
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {displayLabel}
    </span>
  )
}
