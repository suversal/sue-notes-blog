'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Progressive enhancement: server-rendered content stays readable without JavaScript. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const element = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = element.current
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!node || preference.matches || !('IntersectionObserver' in window)) return
    const animations = new Set<Animation>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const animation = node.animate(
            [
              { opacity: 0.3, transform: 'translateY(16px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 600, delay, easing: 'cubic-bezier(.22,1,.36,1)' },
          )
          animations.add(animation)
          animation.onfinish = () => animations.delete(animation)
          observer.unobserve(node)
        }
      },
      { threshold: 0.08 },
    )
    const stop = () => {
      if (preference.matches) {
        observer.disconnect()
        animations.forEach((animation) => animation.cancel())
      }
    }
    observer.observe(node)
    preference.addEventListener('change', stop)
    return () => {
      observer.disconnect()
      animations.forEach((animation) => animation.cancel())
      preference.removeEventListener('change', stop)
    }
  }, [delay])
  return <div ref={element}>{children}</div>
}
