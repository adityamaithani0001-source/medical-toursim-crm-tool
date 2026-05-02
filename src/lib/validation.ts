import { z } from 'zod'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine(v => !isNaN(Date.parse(v)), 'Must be a valid date')

// Accepts datetime-local format (YYYY-MM-DDTHH:mm) and full ISO timestamps from Supabase
const isoDatetime = z
  .string()
  .refine(v => !isNaN(Date.parse(v)), 'Must be a valid date and time')

const pipelineStages = [
  'new_lead', 'qualified', 'consult_scheduled', 'consult_done',
  'quote_sent', 'deposit_paid', 'arrival_confirmed', 'surgery_done', 'post_care',
] as const

const leadSources    = ['whatsapp', 'email', 'booking_form', 'ad'] as const
const commsChannels  = ['whatsapp', 'kakaotalk', 'telegram', 'instagram', 'line', 'wechat', 'email'] as const
const probabilities  = ['low', 'medium', 'high'] as const
const paymentMethods = ['card', 'bank_transfer', 'cash', 'other'] as const

export const newLeadSchema = z.object({
  name:                   z.string().min(1, 'Name is required').max(200, 'Name too long'),
  passport_name:          z.string().max(200, 'Passport name too long').nullable().optional(),
  dob:                    isoDate.nullable().optional(),
  nationality:            z.string().max(100, 'Nationality too long').nullable().optional(),
  country:                z.string().min(1, 'Country is required').max(100, 'Country too long'),
  photo_url:              z.string().url().nullable().optional(),
  phone:                  z.string().max(50, 'Phone too long').nullable().optional(),
  email:                  z.string().email('Must be a valid email').max(200).nullable().optional(),
  past_surgery_history:   z.string().max(2000, 'Past surgery history too long').nullable().optional(),
  lead_source:            z.enum(leadSources),
  preferred_channel:      z.enum(commsChannels),
  surgery_type:           z.string().min(1, 'Surgery type is required').max(200, 'Surgery type too long'),
  conversion_probability: z.enum(probabilities),
  korea_arrival_date:     isoDate.nullable().optional(),
  logistics_notes:        z.string().max(2000).nullable().optional(),
  notes:                  z.string().max(2000, 'Notes too long (max 2000 chars)').optional(),
})

export const patientUpdateSchema = z.object({
  name:                   z.string().min(1).max(200).optional(),
  passport_name:          z.string().max(200).nullable().optional(),
  dob:                    isoDate.nullable().optional(),
  nationality:            z.string().max(100).nullable().optional(),
  country:                z.string().min(1).max(100).optional(),
  photo_url:              z.string().url().nullable().optional(),
  phone:                  z.string().max(50).nullable().optional(),
  email:                  z.string().email('Must be a valid email').max(200).nullable().optional(),
  past_surgery_history:   z.string().max(2000).nullable().optional(),
  surgery_type:           z.string().min(1).max(200).optional(),
  pipeline_stage:         z.enum(pipelineStages).optional(),
  lead_source:            z.enum(leadSources).optional(),
  preferred_channel:      z.enum(commsChannels).optional(),
  conversion_probability: z.enum(probabilities).optional(),
  korea_arrival_date:     isoDatetime.nullable().optional(),
  surgery_date:           isoDatetime.nullable().optional(),
  clinic_id:              z.string().uuid().nullable().optional(),
  deposit_amount:         z.number().positive().nullable().optional(),
  deposit_currency:       z.string().length(3, 'Currency must be a 3-letter code').optional(),
  payment_method:         z.enum(paymentMethods).nullable().optional(),
  airport_pickup:         z.boolean().optional(),
  hotel_name:             z.string().max(200).nullable().optional(),
  hotel_checkin:          isoDatetime.nullable().optional(),
  hotel_checkout:         isoDatetime.nullable().optional(),
  car_arranged:           z.boolean().optional(),
  logistics_notes:        z.string().max(2000).nullable().optional(),
  quote_sent_via:         z.enum(commsChannels).nullable().optional(),
  quote_sent_at:          z.string().nullable().optional(),
  happy_call_date:        isoDate.nullable().optional(),
  happy_call_type:        z.string().max(50).nullable().optional(),
  happy_call_outcome:     z.string().max(1000).nullable().optional(),
  notes:                  z.string().max(2000).nullable().optional(),
}).superRefine((data, ctx) => {
  if (
    data.hotel_checkin && data.hotel_checkout &&
    new Date(data.hotel_checkin) >= new Date(data.hotel_checkout)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hotel_checkout'],
      message: 'Check-out must be after check-in',
    })
  }
  if (
    data.korea_arrival_date && data.surgery_date &&
    new Date(data.surgery_date) < new Date(data.korea_arrival_date)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['surgery_date'],
      message: 'Surgery date cannot be before arrival date',
    })
  }
})

export const consultationSchema = z.object({
  patient_id:   z.string().uuid('Invalid patient ID'),
  scheduled_at: z.string().datetime('Must be a valid ISO datetime'),
  meet_link:    z.string().url('Must be a valid URL').optional(),
})

// Used by CSV import row validation
export const csvRowSchema = z.object({
  name:                   z.string().min(1, 'Name is required').max(200, 'Name too long'),
  passport_name:          z.string().max(200).nullable().optional(),
  dob:                    isoDate.nullable().optional(),
  nationality:            z.string().max(100).nullable().optional(),
  country:                z.string().min(1, 'Country is required').max(100, 'Country too long'),
  phone:                  z.string().max(50).nullable().optional(),
  email:                  z.string().email().max(200).nullable().optional(),
  past_surgery_history:   z.string().max(2000).nullable().optional(),
  surgery_type:           z.string().min(1, 'Surgery type is required').max(200, 'Surgery type too long'),
  lead_source:            z.enum(leadSources).catch('email'),
  preferred_channel:      z.enum(commsChannels).catch('email'),
  conversion_probability: z.enum(probabilities).catch('medium'),
  korea_arrival_date:     isoDate.nullable().optional(),
  notes:                  z.string().max(2000, 'Notes too long').optional(),
})

export type NewLeadFormData      = z.infer<typeof newLeadSchema>
export type PatientUpdateData    = z.infer<typeof patientUpdateSchema>
export type ConsultationFormData = z.infer<typeof consultationSchema>
export type CsvRowData           = z.infer<typeof csvRowSchema>
