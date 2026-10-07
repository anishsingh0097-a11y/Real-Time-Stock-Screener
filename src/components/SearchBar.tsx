'use client'
import React, { useEffect, useRef } from 'react'

interface Props { value: string; onChange: (v: string) => void; resultCount: number }

export function SearchBar({ value, onChange, resultCount }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  // Press "/" anywhere to jump to the search box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (e.key === '/' && !typing) { e.preventDefault(); ref.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = value.trim().length > 0
  return (
    <div className="relative flex-1 max-w-xl mx-6" role="search">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') { onChange(''); ref.current?.blur() } }}
        placeholder="Search company or symbol: Tata, Reliance, AAPL...  ( / )"
        aria-label="Search companies"
        className="w-full h-9 pl-9 pr-28 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
      />
      {active && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400" title="Searching all companies; filters are paused while you search">
            {resultCount.toLocaleString('en-IN')} found
          </span>
          <button onClick={() => onChange('')} aria-label="Clear search" className="w-5 h-5 grid place-items-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
