'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { searchPatients } from '@/lib/db'
import { PIPELINE_STAGES } from '@/types'

const NAV_LINKS = [
  { href: '/dashboard',     label: 'Pipeline' },
  { href: '/consultations', label: 'Consultations' },
  { href: '/analytics',     label: 'Analytics' },
  { href: '/calendar',      label: 'Calendar' },
]

type SearchResult = { id: string; name: string; country: string; surgery_type: string; pipeline_stage: string }

export default function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open,    setOpen]    = useState(false)
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    try {
      const data = await searchPatients(q.trim())
      setResults(data)
      setOpen(data.length > 0)
    } catch {
      setResults([])
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 280)
    return () => clearTimeout(t)
  }, [query, runSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goToPatient = (id: string) => {
    setQuery('')
    setResults([])
    setOpen(false)
    router.push(`/patients/${id}`)
  }

  const stageLabel = (key: string) =>
    PIPELINE_STAGES.find(s => s.key === key)?.label ?? key

  const stageColor = (key: string) =>
    PIPELINE_STAGES.find(s => s.key === key)?.color ?? '#6366f1'

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 sticky top-0 z-30">
      <div className="max-w-[1800px] mx-auto flex items-center gap-5 h-14">

        {/* Home button */}
        <Link href="/" className="flex items-center gap-2 group mr-2" aria-label="Go to home">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-700 transition-colors">
            <span className="text-white text-xs font-bold">MT</span>
          </div>
          <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors hidden sm:block">
            Home
          </span>
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Section links */}
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium h-14 flex items-center border-b-2 transition-colors ${
              pathname.startsWith(link.href)
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-500 hover:text-indigo-600 border-transparent hover:border-indigo-300'
            }`}
          >
            {link.label}
          </Link>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Patient search */}
        <div ref={wrapRef} className="relative">
          <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 transition-all ${
            focused ? 'border-indigo-400 bg-white shadow-sm' : 'border-gray-200 bg-gray-50'
          }`}>
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search patient…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onKeyDown={e => e.key === 'Escape' && (setOpen(false), setQuery(''))}
              className="w-44 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="text-gray-300 hover:text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {open && results.length > 0 && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              <ul>
                {results.map(r => (
                  <li key={r.id}>
                    <button
                      onClick={() => goToPatient(r.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400 truncate">{r.country} · {r.surgery_type}</p>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                        style={{ backgroundColor: stageColor(r.pipeline_stage) }}
                      >
                        {stageLabel(r.pipeline_stage)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="h-2" />
            </div>
          )}
        </div>

      </div>
    </nav>
  )
}
