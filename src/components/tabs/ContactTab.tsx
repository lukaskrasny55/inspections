import { useEffect, useRef, useState } from 'react'
import { updateCustomer } from '../../lib/api'
import type { Customer } from '../../types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  customer: Customer
  onSaved: (customer: Customer) => void
}

type FieldKey = 'name' | 'address' | 'siteAddress' | 'phone' | 'email' | 'buildingAdmin'

const FIELDS: { key: FieldKey; label: string; type?: string }[] = [
  { key: 'name', label: 'Meno / názov' },
  { key: 'address', label: 'Adresa' },
  { key: 'siteAddress', label: 'Pracovisko (adresa realizácie, ak iná ako adresa)' },
  { key: 'phone', label: 'Telefón', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'buildingAdmin', label: 'Správca budovy' },
]

export default function ContactTab({ customer, onSaved }: Props) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    name: customer.name,
    address: customer.address ?? '',
    siteAddress: customer.siteAddress ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    buildingAdmin: customer.buildingAdmin ?? '',
  })
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Clear any pending save when the tab/component unmounts.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  function scheduleSave(next: Record<FieldKey, string>) {
    setStatus('saving')
    setError(null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        const updated = await updateCustomer(customer.id, next)
        onSaved(updated)
        setStatus('saved')
      } catch (err) {
        setStatus('error')
        setError((err as Error).message)
      }
    }, 800)
  }

  function handleChange(key: FieldKey, value: string) {
    const next = { ...values, [key]: value }
    setValues(next)
    scheduleSave(next)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Kontaktné údaje</h2>
        <SaveIndicator status={status} error={error} />
      </div>

      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
          <input
            type={field.type ?? 'text'}
            value={values[field.key]}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      ))}
    </div>
  )
}

function SaveIndicator({ status, error }: { status: SaveStatus; error: string | null }) {
  if (status === 'saving') return <span className="text-xs text-slate-400">Ukladám…</span>
  if (status === 'saved') return <span className="text-xs text-green-600">Uložené</span>
  if (status === 'error') return <span className="text-xs text-red-600">{error || 'Chyba pri ukladaní'}</span>
  return null
}
