'use client'

import { useEffect, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 800, 
  className = '', 
  prefix = '', 
  suffix = '' 
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    
    const startTime = Date.now()
    const startValue = displayValue
    const endValue = value
    const change = endValue - startValue

    const animateCounter = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
      const currentValue = startValue + change * easeOutCubic(progress)
      
      setDisplayValue(Math.round(currentValue))
      
      if (progress < 1) {
        requestAnimationFrame(animateCounter)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animateCounter)
  }, [value, duration])

  return (
    <span 
      className={`${className} ${isAnimating ? 'number-counter' : ''}`}
      key={value} // Force re-render on value change
    >
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}