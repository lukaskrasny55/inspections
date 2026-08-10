import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HELP_SECTIONS } from '../lib/helpContent'

export default function NavodPage() {
  const [query, setQuery] = useState('')

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HELP_SECTIONS
    return HELP_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q) || section.title.toLowerCase().includes(q),
      ),
    })).filter((section) => section.items.length > 0)
  }, [query])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Zoznam zákaziek
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">Návod</h1>
        <p className="text-sm text-slate-500 mt-1">Vysvetlenie všetkých záložiek, políčok a funkcií appky.</p>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hľadať (napr. „stratné“, „technik“, „email“…)"
          className="mt-4 w-full max-w-xl px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        {!query.trim() && (
          <nav className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {HELP_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-brand-600 hover:text-brand-700 hover:underline">
                {s.title}
              </a>
            ))}
          </nav>
        )}

        {filteredSections.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-slate-500 text-sm text-center">
            Nič sa nenašlo pre „{query}“.
          </div>
        )}

        {filteredSections.map((section) => (
          <section key={section.id} id={section.id} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 scroll-mt-4">
            <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.title}>
                  <div className="text-sm font-medium text-slate-700">{item.title}</div>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{item.content}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
