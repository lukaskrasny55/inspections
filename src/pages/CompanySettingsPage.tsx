import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCompanySettings, updateCompanySettings } from '../lib/api'
import { fileToStorableDataUrl } from '../lib/image'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type FieldKey = 'ico' | 'dic' | 'iban' | 'bic' | 'address' | 'email' | 'phone'

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'address', label: 'Adresa firmy' },
  { key: 'ico', label: 'IČO' },
  { key: 'dic', label: 'DIČ' },
  { key: 'iban', label: 'IBAN' },
  { key: 'bic', label: 'BIC/SWIFT' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefón' },
]

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [values, setValues] = useState<Record<FieldKey, string>>({
    ico: '',
    dic: '',
    iban: '',
    bic: '',
    address: '',
    email: '',
    phone: '',
  })
  const [notifyEmail, setNotifyEmail] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetchCompanySettings()
      .then((settings) => {
        if (settings) {
          setValues({
            ico: settings.ico ?? '',
            dic: settings.dic ?? '',
            iban: settings.iban ?? '',
            bic: settings.bic ?? '',
            address: settings.address ?? '',
            email: settings.email ?? '',
            phone: settings.phone ?? '',
          })
          setLogoUrl(settings.logoUrl)
          setNotifyEmail(settings.notifyEmail ?? '')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function scheduleSave(patch: Partial<Record<FieldKey, string>>) {
    setStatus('saving')
    setError(null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateCompanySettings(patch)
        setStatus('saved')
      } catch (err) {
        setStatus('error')
        setError((err as Error).message)
      }
    }, 800)
  }

  function handleChange(key: FieldKey, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
    scheduleSave({ [key]: value })
  }

  function handleNotifyEmailChange(value: string) {
    setNotifyEmail(value)
    setStatus('saving')
    setError(null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateCompanySettings({ notifyEmail: value })
        setStatus('saved')
      } catch (err) {
        setStatus('error')
        setError((err as Error).message)
      }
    }, 800)
  }

  async function handleLogoSelected(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setUploadingLogo(true)
    setError(null)
    try {
      const dataUrl = await fileToStorableDataUrl(file)
      const updated = await updateCompanySettings({ logoUrl: dataUrl })
      setLogoUrl(updated.logoUrl)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400">Načítavam…</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <Link to="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white">
          ← Zoznam zákaziek
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mt-1">Firemné údaje</h1>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fakturačné údaje</h2>
            {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
            {!error && <SaveIndicator status={status} />}
          </div>

          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
              <input
                value={values[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kópie odoslaných ponúk</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail na kópie ponúk</label>
            <input
              value={notifyEmail}
              onChange={(e) => handleNotifyEmailChange(e.target.value)}
              placeholder="napr. info@tmshydra.com"
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Keď zákazníkovi odošleš ponuku z appky, kópia príde aj sem. Nechaj prázdne, ak kópiu nechceš.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Logo</h2>
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-20 object-contain" />}
          <label className="inline-block px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition cursor-pointer">
            {uploadingLogo ? 'Nahrávam…' : logoUrl ? 'Nahradiť logo' : 'Nahrať logo'}
            <input
              type="file"
              accept="image/*"
              disabled={uploadingLogo}
              onChange={(e) => handleLogoSelected(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </main>
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') return <span className="text-xs text-slate-400">Ukladám…</span>
  if (status === 'saved') return <span className="text-xs text-green-600 dark:text-green-400">Uložené</span>
  return null
}
