'use client'
// src/app/patients/[id]/page.tsx

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPatient, updatePatient, getClinics, getConsultationsForPatient, uploadPatientPhoto, getProfiles } from '@/lib/db'
import { patientUpdateSchema } from '@/lib/validation'
import type { Patient, Clinic, Consultation, PipelineStage, Profile } from '@/types'
import { PIPELINE_STAGES, CHANNEL_LABELS } from '@/types'

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

function formatSurgeryTypes(value: string | null | undefined): string {
  if (!value) return ''
  return value.split(',').map(s => {
    const t = s.trim()
    return t.charAt(0).toUpperCase() + t.slice(1)
  }).join(', ')
}
import Link from 'next/link'
import ProgressStatusBar from '@/app/components/ProgressStatusBar'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'

const STAGE_COLOR: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map(s => [s.key, s.color])
)

// Converts any ISO string to the YYYY-MM-DDTHH:mm format required by datetime-local inputs
const toDatetimeLocal = (v: string | null | undefined) => v ? v.slice(0, 16) : ''

function PatientDetailContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [edits, setEdits] = useState<Partial<Patient>>({})
  const [dirty, setDirty] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([getPatient(id), getClinics(), getConsultationsForPatient(id), getProfiles()])
      .then(([p, c, cons, profs]) => {
        setPatient(p as Patient)
        setClinics(c as Clinic[])
        setConsultations(cons)
        setProfiles((profs ?? []) as Profile[])
      })
      .finally(() => setLoading(false))
  }, [id])

  const set = (k: keyof Patient, v: unknown) => {
    setEdits(e => ({ ...e, [k]: v }))
    setDirty(true)
  }

  const val = (k: keyof Patient) => (edits[k] !== undefined ? edits[k] : patient?.[k]) as string

  const save = async () => {
    if (!patient || !dirty) return
    setSaveError('')
    const result = patientUpdateSchema.safeParse(edits)
    if (!result.success) {
      const msgs = result.error.issues.map(i => `${String(i.path[0])}: ${i.message}`)
      setSaveError(msgs.join(' · '))
      return
    }
    setSaving(true)
    try {
      const updated = await updatePatient(patient.id, edits)
      setPatient(updated)
      setEdits({})
      setDirty(false)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !patient) return
    if (file.size > 5 * 1024 * 1024) { setSaveError('Photo must be under 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setPhotoUploading(true)
    try {
      const url = await uploadPatientPhoto(file, patient.name)
      const updated = await updatePatient(patient.id, { photo_url: url })
      setPatient(updated)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Photo upload failed')
    } finally {
      setPhotoUploading(false)
    }
  }

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!patient) return <div className="p-8 text-gray-400">Patient not found</div>

  const stage = val('pipeline_stage') as PipelineStage
  const stageColor = STAGE_COLOR[stage] ?? '#6366f1'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-gray-100 px-6 py-4 sticky top-14 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
            {/* Avatar */}
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              title="Change photo"
              className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 hover:border-indigo-300 transition-colors relative"
            >
              {photoPreview || patient.photo_url ? (
                <img src={photoPreview || patient.photo_url!} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {getInitials(patient.name)}
                </span>
              )}
              {photoUploading && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{patient.name}</h1>
              <p className="text-xs text-gray-400">{patient.country} · {formatSurgeryTypes(patient.surgery_type)}</p>
            </div>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: stageColor }}
            >
              {PIPELINE_STAGES.find(s => s.key === stage)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {saveError && (
              <p className="text-xs text-red-500 max-w-sm">{saveError}</p>
            )}
            {dirty && (
              <button
                onClick={save}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress status bar */}
      <ProgressStatusBar currentStage={stage} />

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-3 gap-6">

        {/* Left column — core info */}
        <div className="col-span-2 space-y-5">

          <Section title="Pipeline stage">
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              value={val('pipeline_stage')}
              onChange={e => set('pipeline_stage', e.target.value)}
            >
              {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Section>

          <Section title="Patient details">
            <Grid2>
              <Field label="Full name">
                <Input value={val('name')} onChange={v => set('name', v)} />
              </Field>
              <Field label="Full name as per passport">
                <Input value={val('passport_name') ?? ''} onChange={v => set('passport_name', v)} placeholder="As printed on passport" />
              </Field>
              <Field label="Date of birth">
                <Input type="datetime-local" value={toDatetimeLocal(val('dob'))} onChange={v => set('dob', v)} />
              </Field>
              <Field label="Nationality">
                <SelectField value={val('nationality') ?? ''} onChange={v => set('nationality', v)}>
                  <option value="">Select nationality…</option>
                  {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                </SelectField>
              </Field>
              <Field label="Country">
                <Input value={val('country')} onChange={v => set('country', v)} />
              </Field>
              <Field label="Surgery type">
                <SurgeryMultiSelect
                  value={val('surgery_type') ?? ''}
                  onChange={v => set('surgery_type', v)}
                />
              </Field>
              <Field label="Preferred channel">
                <SelectField value={val('preferred_channel')} onChange={v => set('preferred_channel', v)}>
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
              </Field>
              <Field label="Conversion probability">
                <SelectField value={val('conversion_probability')} onChange={v => set('conversion_probability', v)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </SelectField>
              </Field>
              <Field label="Assigned manager">
                <SelectField value={val('assigned_manager') ?? ''} onChange={v => set('assigned_manager', v || null)}>
                  <option value="">Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </SelectField>
              </Field>
            </Grid2>
          </Section>

          <Section title="Contact details">
            <Grid2>
              <Field label="Phone / WhatsApp">
                <Input value={val('phone') ?? ''} onChange={v => set('phone', v)} placeholder="+62 812 3456 7890" />
              </Field>
              <Field label="Email">
                <Input type="email" value={val('email') ?? ''} onChange={v => set('email', v)} placeholder="patient@email.com" />
              </Field>
            </Grid2>
          </Section>

          <Section title="Medical history">
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              rows={3}
              value={val('past_surgery_history') ?? ''}
              onChange={e => set('past_surgery_history', e.target.value)}
              placeholder="Previous procedures, relevant medical history…"
            />
          </Section>

          <Section title="Logistics">
            <Grid2>
              <Field label="Korea arrival (date & time)">
                <Input type="datetime-local" value={toDatetimeLocal(val('korea_arrival_date'))} onChange={v => set('korea_arrival_date', v)} />
              </Field>
              <Field label="Surgery date & time">
                <Input type="datetime-local" value={toDatetimeLocal(val('surgery_date'))} onChange={v => set('surgery_date', v)} />
              </Field>
              <Field label="Clinic">
                <SelectField value={val('clinic_id') ?? ''} onChange={v => set('clinic_id', v)}>
                  <option value="">Not selected</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
              </Field>
              <Field label="Hotel">
                <Input value={val('hotel_name') ?? ''} onChange={v => set('hotel_name', v)} placeholder="Hotel name" />
              </Field>
              <Field label="Check-in (date & time)">
                <Input type="datetime-local" value={toDatetimeLocal(val('hotel_checkin'))} onChange={v => set('hotel_checkin', v)} />
              </Field>
              <Field label="Check-out (date & time)">
                <Input type="datetime-local" value={toDatetimeLocal(val('hotel_checkout'))} onChange={v => set('hotel_checkout', v)} />
              </Field>
            </Grid2>
            <div className="mt-4 flex gap-6">
              <Checkbox
                label="Airport pickup arranged"
                checked={!!(edits.airport_pickup ?? patient.airport_pickup)}
                onChange={v => set('airport_pickup', v)}
              />
              <Checkbox
                label="Car / transfer arranged"
                checked={!!(edits.car_arranged ?? patient.car_arranged)}
                onChange={v => set('car_arranged', v)}
              />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Logistics Notes</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                rows={3}
                placeholder="e.g. needs airport pickup, wheelchair access, hotel booked"
                value={val('logistics_notes') ?? ''}
                onChange={e => set('logistics_notes', e.target.value)}
              />
            </div>
          </Section>

          <Section title="Deposit">
            <Grid2>
              <Field label="Expected Deposit (USD)">
                <Input
                  type="number"
                  value={val('expected_deposit_amount') ?? ''}
                  onChange={v => set('expected_deposit_amount', parseFloat(v) || null)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Amount paid">
                <Input
                  type="number"
                  value={val('deposit_amount') ?? ''}
                  onChange={v => set('deposit_amount', parseFloat(v) || null)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Currency">
                <Input value={val('deposit_currency') ?? 'USD'} onChange={v => set('deposit_currency', v)} />
              </Field>
              <Field label="Payment method">
                <SelectField value={val('payment_method') ?? ''} onChange={v => set('payment_method', v)}>
                  <option value="">Not paid</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </SelectField>
              </Field>
              <Field label="Quote sent via">
                <SelectField value={val('quote_sent_via') ?? ''} onChange={v => set('quote_sent_via', v)}>
                  <option value="">Not sent</option>
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
              </Field>
            </Grid2>
          </Section>

          <Section title="Post-care (happy call)">
            <Grid2>
              <Field label="Happy call date">
                <Input type="date" value={val('happy_call_date') ?? ''} onChange={v => set('happy_call_date', v)} />
              </Field>
              <Field label="Follow-up type">
                <SelectField value={val('happy_call_type') ?? ''} onChange={v => set('happy_call_type', v)}>
                  <option value="">Select type…</option>
                  <option value="phone_call">Phone Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="video_call">Video Call</option>
                  <option value="in_person">In Person</option>
                  <option value="other">Other</option>
                </SelectField>
              </Field>
              <Field label="Outcome / notes" >
                <Input value={val('happy_call_outcome') ?? ''} onChange={v => set('happy_call_outcome', v)} placeholder="Patient satisfied, healing well…" />
              </Field>
            </Grid2>
          </Section>

          <Section title="Notes">
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              rows={4}
              value={val('notes') ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Internal notes…"
            />
          </Section>
        </div>

        {/* Right column — consultations + meta */}
        <div className="space-y-5">
          <Section title="Consultations">
            <Link
              href={`/consultations?patient=${patient.id}`}
              className="block text-xs text-indigo-600 font-medium hover:underline mb-3"
            >
              + Schedule consultation
            </Link>
            {consultations.length === 0 ? (
              <p className="text-xs text-gray-300 py-4 text-center">None yet</p>
            ) : (
              <div className="space-y-2">
                {consultations.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-700">
                      {new Date(c.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {c.completed && <span className="text-xs text-emerald-600">✓ Completed</span>}
                    {c.dominic_memo && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.dominic_memo}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Record info">
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{new Date(patient.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{new Date(patient.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Source</span>
                <span className="capitalize">{patient.lead_source.replace('_', ' ')}</span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

export default function PatientDetailPage() {
  return <ErrorBoundary><PatientDetailContent /></ErrorBoundary>
}

// Shared primitives
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string | number | null | undefined
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={(value as string) ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
    />
  )
}

function SelectField({ value, onChange, children }: {
  value: string | null | undefined
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
    >
      {children}
    </select>
  )
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-indigo-600"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function SurgeryMultiSelect({ value, onChange }: {
  value: string
  onChange: (v: string) => void
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
    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-xl min-h-[42px]">
      {SURGERY_TYPES.map(t => {
        const isSelected = selected.includes(t.toLowerCase())
        return (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
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
  )
}
