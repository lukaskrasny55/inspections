import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PriceListCatalog from '../components/PriceListCatalog'
import TechnicalSolutionCatalog from '../components/TechnicalSolutionCatalog'

type View = 'checklist' | 'technicke-riesenie'

export default function KatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = searchParams.get('view') === 'technicke-riesenie' ? 'technicke-riesenie' : 'checklist'
  const [view, setView] = useState<View>(initial)

  function selectView(next: View) {
    setView(next)
    setSearchParams({ view: next }, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Zoznam zákaziek
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">Katalóg</h1>

        <div className="flex gap-1 mt-4">
          <button
            onClick={() => selectView('checklist')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === 'checklist' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Checklist
          </button>
          <button
            onClick={() => selectView('technicke-riesenie')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              view === 'technicke-riesenie' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Technické riešenie
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          {view === 'checklist' ? <PriceListCatalog /> : <TechnicalSolutionCatalog />}
        </div>
      </main>
    </div>
  )
}
