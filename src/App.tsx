import { Navigate, Route, Routes } from 'react-router-dom'
import InspectionsListPage from './pages/InspectionsListPage'
import InspectionDetailPage from './pages/InspectionDetailPage'
import PlanPage from './pages/PlanPage'
import SummaryPage from './pages/SummaryPage'
import CompanySettingsPage from './pages/CompanySettingsPage'
import KatalogPage from './pages/KatalogPage'
import TechniciansPage from './pages/TechniciansPage'
import MaterialCompositionsPage from './pages/MaterialCompositionsPage'
import MaterialProductsPage from './pages/MaterialProductsPage'
import DocumentTemplatesPage from './pages/DocumentTemplatesPage'
import NavodPage from './pages/NavodPage'
import TabletGuard from './components/TabletGuard'
import AuthGate from './components/AuthGate'

export default function App() {
  return (
    <AuthGate>
    <TabletGuard>
      <Routes>
        <Route path="/" element={<InspectionsListPage />} />
        <Route path="/inspections/:id" element={<InspectionDetailPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/navod" element={<NavodPage />} />
        <Route path="/settings/company" element={<CompanySettingsPage />} />
        <Route path="/settings/katalog" element={<KatalogPage />} />
        <Route path="/settings/price-list" element={<Navigate to="/settings/katalog?view=checklist" replace />} />
        <Route path="/settings/checklist-catalog" element={<Navigate to="/settings/katalog?view=technicke-riesenie" replace />} />
        <Route path="/settings/technicians" element={<TechniciansPage />} />
        <Route path="/settings/material-compositions" element={<MaterialCompositionsPage />} />
        <Route path="/settings/material-products" element={<MaterialProductsPage />} />
        <Route path="/settings/document-templates" element={<DocumentTemplatesPage />} />
      </Routes>
    </TabletGuard>
    </AuthGate>
  )
}
