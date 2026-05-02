'use client'
// src/app/leads/new/page.tsx

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPatient, uploadPatientPhoto, getProfiles } from '@/lib/db'
import { newLeadSchema } from '@/lib/validation'
import type { LeadSource, CommsChannel, ConversionProbability, Profile } from '@/types'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'

const CHANNELS: CommsChannel[] = ['whatsapp', 'kakaotalk', 'telegram', 'instagram', 'line', 'wechat', 'email']
const SOURCES: LeadSource[]    = ['whatsapp', 'email', 'booking_form', 'ad']
const SURGERY_TYPES = ['Eyes', 'Nose', 'Face', 'Breast', 'Body', 'Other']

const NATIONALITIES = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentine', 'Armenian',
  'Australian', 'Austrian', 'Azerbaijani', 'Bahraini', 'Bangladeshi', 'Belarusian', 'Belgian',
  'Bolivian', 'Bosnian', 'Brazilian', 'British', 'Bulgarian', 'Cambodian', 'Cameroonian',
  'Canadian', 'Chilean', 'Chinese', 'Colombian', 'Congolese', 'Croatian', 'Cuban', 'Czech',
  'Danish', 'Dominican', 'Dutch', 'Ecuadorian', 'Egyptian', 'Emirati', 'Estonian', 'Ethiopian',
  'Filipino', 'Finnish', 'French', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Guatemalan',
  'Honduran', 'Hungarian', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli',
  'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakhstani', 'Kenyan', 'Kuwaiti',
  'Kyrgyz', 'Lao', 'Latvian', 'Lebanese', 'Libyan', 'Lithuanian', 'Luxembourgish', 'Macedonian',
  'Malaysian', 'Maldivian', 'Mexican', 'Moldovan', 'Mongolian', 'Moroccan', 'Mozambican',
  'Burmese', 'Nepali', 'New Zealander', 'Nigerian', 'Norwegian', 'Omani', 'Pakistani',
  'Palestinian', 'Panamanian', 'Paraguayan', 'Peruvian', 'Polish', 'Portuguese', 'Qatari',
  'Romanian', 'Russian', 'Saudi', 'Senegalese', 'Serbian', 'Singaporean', 'Slovak', 'Slovenian',
  'Somali', 'South African', 'South Korean', 'Spanish', 'Sri Lankan', 'Sudanese', 'Swedish',
  'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Tunisian', 'Turkish',
  'Turkmen', 'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek', 'Venezuelan', 'Vietnamese',
  'Yemeni', 'Zambian', 'Zimbabwean', 'Other',
].sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b))

function NewLeadContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [arrivalDate, setArrivalDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [assignedManager, setAssignedManager] = useState('')

  useEffect(() => {
    getProfiles().then(data => setProfiles((data ?? []) as Profile[])).catch(() => {})
  }, [])

  const [form, setForm] = useState({
    name:                   '',
    passport_name:          '',
    dob:                    '',
    nationality:            '',
    country:                '',
    phone:                  '',
    email:                  '',
    past_surgery_history:   '',
    lead_source:            'whatsapp' as LeadSource,
    preferred_channel:      'whatsapp' as CommsChannel,
    surgery_type:           '',
    conversion_probability: 'medium' as ConversionProbability,
    logistics_notes:        '',
    notes:                  '',
  })

  const combinedArrival = arrivalDate
    ? arrivalTime ? `${arrivalDate}T${arrivalTime}` : arrivalDate
    : ''

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setFieldErrors(e => { const next = { ...e }; delete next[k]; return next })
  }

  const handleSubmit = async () => {
    setError('')
    setFieldErrors({})
    const result = newLeadSchema.safeParse({
      ...form,
      passport_name:        form.passport_name || null,
      dob:                  form.dob || null,
      nationality:          form.nationality || null,
      phone:                form.phone || null,
      email:                form.email || null,
      past_surgery_history: form.past_surgery_history || null,
      korea_arrival_date:   combinedArrival || null,
      logistics_notes:      form.logistics_notes || null,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0])
        if (!errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      setError('Please fix the errors below.')
      return
    }
    setLoading(true)
    try {
      let photo_url: string | null = null
      if (photoFile) {
        photo_url = await uploadPatientPhoto(photoFile, form.name || 'patient')
      }
      const patient = await createPatient({
        ...form,
        passport_name:        form.passport_name || null,
        dob:                  form.dob || null,
        nationality:          form.nationality || null,
        phone:                form.phone || null,
        email:                form.email || null,
        past_surgery_history: form.past_surgery_history || null,
        photo_url,
        logistics_notes:      form.logistics_notes || null,
        pipeline_stage:       'new_lead',
        deposit_currency:     'USD',
        airport_pickup:       false,
        car_arranged:         false,
        assigned_rep:         null,
        assigned_coordinator: null,
        assigned_manager:     assignedManager || null,
        expected_deposit_amount: null,
        clinic_id:            null,
        deposit_amount:       null,
        payment_method:       null,
        hotel_name:           null,
        hotel_checkin:        null,
        hotel_checkout:       null,
        quote_sent_via:       null,
        quote_sent_at:        null,
        happy_call_date:      null,
        happy_call_type:      null,
        happy_call_outcome:   null,
        korea_arrival_date:   combinedArrival || null,
        surgery_date:         null,
      })
      router.push(`/patients/${patient.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New Lead</h1>
          <p className="text-gray-500 mt-1 text-sm">Capture inbound contact details</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">

          {/* Section: Patient */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Patient</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Photo upload */}
              <div className="col-span-2 flex items-center gap-4">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 hover:border-indigo-400 flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-gray-300">+</span>
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-700">Patient photo</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG or WebP · max 5 MB</p>
                  {photoPreview && (
                    <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview('') }} className="text-xs text-red-400 hover:text-red-600 mt-1">Remove</button>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Full name *</Label>
                <Input value={form.name} onChange={v => set('name', v)} placeholder="Kim Soo-jin" error={fieldErrors.name} />
              </div>
              <div className="col-span-2">
                <Label>Full name as per passport</Label>
                <Input value={form.passport_name} onChange={v => set('passport_name', v)} placeholder="As printed on passport" error={fieldErrors.passport_name} />
              </div>
              <div>
                <Label>Date of birth</Label>
                <Input type="date" value={form.dob} onChange={v => set('dob', v)} error={fieldErrors.dob} />
              </div>
              <div>
                <Label>Nationality</Label>
                <Select value={form.nationality} onChange={v => set('nationality', v)} error={fieldErrors.nationality}>
                  <option value="">Select nationality…</option>
                  {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Country *</Label>
                <Input value={form.country} onChange={v => set('country', v)} placeholder="Indonesia" error={fieldErrors.country} />
              </div>
            </div>
          </div>

          {/* Section: Contact */}
          <div className="pt-4 border-t border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone / WhatsApp</Label>
                <Input value={form.phone} onChange={v => set('phone', v)} placeholder="+62 812 3456 7890" error={fieldErrors.phone} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={v => set('email', v)} placeholder="patient@email.com" error={fieldErrors.email} />
              </div>
            </div>
          </div>

          {/* Section: Medical history */}
          <div className="pt-4 border-t border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Medical history</h2>
            <div>
              <Label>Past surgery history</Label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                rows={3}
                placeholder="Previous procedures, relevant medical history…"
                value={form.past_surgery_history}
                onChange={e => set('past_surgery_history', e.target.value)}
              />
              {fieldErrors.past_surgery_history && <p className="mt-1 text-xs text-red-500">{fieldErrors.past_surgery_history}</p>}
            </div>
          </div>

          {/* Section: Lead */}
          <div className="pt-4 border-t border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Lead info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lead source</Label>
                <Select value={form.lead_source} onChange={v => set('lead_source', v)}>
                  {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </Select>
              </div>
              <div>
                <Label>Preferred comms channel</Label>
                <Select value={form.preferred_channel} onChange={v => set('preferred_channel', v)}>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Surgery type *</Label>
                <SurgeryMultiSelect
                  value={form.surgery_type}
                  onChange={v => set('surgery_type', v)}
                  error={fieldErrors.surgery_type}
                />
              </div>
              <div>
                <Label>Conversion probability</Label>
                <Select value={form.conversion_probability} onChange={v => set('conversion_probability', v)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </div>
              <div>
                <Label>Assigned manager</Label>
                <Select value={assignedManager} onChange={v => setAssignedManager(v)}>
                  <option value="">Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Travel */}
          <div className="pt-4 border-t border-gray-50">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Travel</h2>
            <div className="space-y-4">
              <div>
                <Label>Planned arrival in Korea</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={arrivalDate}
                      onChange={e => setArrivalDate(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${fieldErrors.korea_arrival_date ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    />
                    <p className="text-xs text-gray-400 mt-1">Arrival date</p>
                  </div>
                  <div>
                    <input
                      type="time"
                      value={arrivalTime}
                      onChange={e => setArrivalTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <p className="text-xs text-gray-400 mt-1">Arrival time</p>
                  </div>
                </div>
                {fieldErrors.korea_arrival_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.korea_arrival_date}</p>}
              </div>
              <div>
                <Label>Logistics Notes</Label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  rows={3}
                  placeholder="e.g. needs airport pickup, wheelchair access, hotel booked"
                  value={form.logistics_notes}
                  onChange={e => set('logistics_notes', e.target.value)}
                />
                {fieldErrors.logistics_notes && <p className="mt-1 text-xs text-red-500">{fieldErrors.logistics_notes}</p>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-4 border-t border-gray-50">
            <Label>Notes</Label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              rows={3}
              placeholder="Any additional context from the initial contact…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
            {fieldErrors.notes && <FieldError>{fieldErrors.notes}</FieldError>}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              {loading ? 'Creating…' : 'Create Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NewLeadPage() {
  return <ErrorBoundary><NewLeadContent /></ErrorBoundary>
}

// Tiny shared form primitives
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1.5">{children}</label>
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-red-500">{children}</p>
}

function Input({ value, onChange, placeholder, type = 'text', error }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
}) {
  return (
    <>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
      />
      {error && <FieldError>{error}</FieldError>}
    </>
  )
}

function Select({ value, onChange, children, error }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  error?: string
}) {
  return (
    <>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
      >
        {children}
      </select>
      {error && <FieldError>{error}</FieldError>}
    </>
  )
}

function SurgeryMultiSelect({ value, onChange, error }: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const toggle = (type: string) => {
    const lower = type.toLowerCase()
    const next = selected.includes(lower)
      ? selected.filter(s => s !== lower)
      : [...selected, lower]
    onChange(next.join(','))
  }
  return (
    <>
      <div className={`flex flex-wrap gap-2 p-3 border rounded-xl ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
        {SURGERY_TYPES.map(t => {
          const isSelected = selected.includes(t.toLowerCase())
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {t}
            </button>
          )
        })}
      </div>
      {selected.length === 0 && !error && (
        <p className="mt-1 text-xs text-gray-400">Select one or more surgery types</p>
      )}
      {error && <FieldError>{error}</FieldError>}
    </>
  )
}
