'use client'

import { useEffect, useState } from 'react'
import { getConsultations } from '@/lib/db'
import type { Consultation } from '@/types'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function CalendarContent() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState<Consultation | null>(null)
  const today   = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  useEffect(() => {
    getConsultations(false)
      .then(setConsultations)
      .finally(() => setLoading(false))
  }, [])

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Build a 6-row × 7-col grid
  const firstWeekday  = new Date(year, month, 1).getDay()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const daysInPrev    = new Date(year, month, 0).getDate()

  const cells: { date: Date; current: boolean }[] = []
  for (let i = firstWeekday - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), current: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), current: true })
  for (let d = 1; cells.length < 42; d++)
    cells.push({ date: new Date(year, month + 1, d), current: false })

  // Index consultations by day key
  const byDay: Record<string, Consultation[]> = {}
  for (const c of consultations) {
    const d   = new Date(c.scheduled_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    ;(byDay[key] ??= []).push(c)
  }

  const isToday = (d: Date) =>
    d.getDate()     === today.getDate()     &&
    d.getMonth()    === today.getMonth()    &&
    d.getFullYear() === today.getFullYear()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-lg leading-none"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-700 w-40 text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors text-lg leading-none"
            >
              ›
            </button>
            <button
              onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="ml-2 text-xs text-indigo-600 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map(({ date, current }, i) => {
              const key         = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
              const dayConsults = byDay[key] ?? []
              const todayCell   = isToday(date)
              const lastCol     = i % 7 === 6

              return (
                <div
                  key={i}
                  className={`min-h-[110px] p-2 border-b border-r border-gray-50 ${
                    !current   ? 'bg-gray-50/60' : ''
                  } ${lastCol ? 'border-r-0'    : ''}`}
                >
                  {/* Date number */}
                  <div className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    todayCell
                      ? 'bg-indigo-600 text-white'
                      : current
                        ? 'text-gray-700'
                        : 'text-gray-300'
                  }`}>
                    {date.getDate()}
                  </div>

                  {/* Consultation chips */}
                  <div className="space-y-1">
                    {dayConsults.map(c => {
                      const past = new Date(c.scheduled_at) < today
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelected(prev => prev?.id === c.id ? null : c)}
                          className={`w-full text-left px-2 py-1 rounded-md text-xs font-medium transition-colors truncate ${
                            c.completed
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : past
                                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          } ${selected?.id === c.id ? 'ring-2 ring-indigo-300' : ''}`}
                        >
                          {new Date(c.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          {c.patient?.name ?? '—'}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-900 text-base">{selected.patient?.name ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(selected.scheduled_at).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                  {' at '}
                  {new Date(selected.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selected.completed && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Completed</span>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-300 hover:text-gray-500 text-xl leading-none ml-1"
                >
                  ×
                </button>
              </div>
            </div>

            {selected.patient && (
              <div className="grid grid-cols-3 gap-3 text-xs mb-4">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-gray-400 mb-0.5">Country</p>
                  <p className="font-medium text-gray-700">{selected.patient.country}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-gray-400 mb-0.5">Surgery type</p>
                  <p className="font-medium text-gray-700">{selected.patient.surgery_type}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-gray-400 mb-0.5">Meet link</p>
                  <a
                    href={selected.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    Join ↗
                  </a>
                </div>
              </div>
            )}

            {selected.dominic_memo && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs">
                <p className="text-gray-400 mb-1">Memo</p>
                <p className="text-gray-700">{selected.dominic_memo}</p>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-5 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-200 inline-block" />
            Upcoming
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />
            Overdue / past
          </span>
        </div>

      </div>
    </div>
  )
}

export default function CalendarPage() {
  return <ErrorBoundary><CalendarContent /></ErrorBoundary>
}
