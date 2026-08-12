import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

// The app is built for tablets used in the field, not phones — dense tables
// (Ponuka line items, checklist rows) and photo/sketch capture need more
// room than a phone screen gives. We check the SHORTER of the two viewport
// dimensions rather than raw width, because a phone rotated to landscape can
// otherwise report a width wider than a small tablet in portrait — the
// shorter dimension stays roughly constant across rotation and reliably
// separates "phone, any orientation" (max ~430px) from "tablet, any
// orientation" (min ~600px on the smallest 7" devices).
const MIN_TABLET_DIMENSION = 600

// The Plán page is a simple day/week list plus a small "add event" form —
// it doesn't need tablet-sized room the way photo/sketch/quote editing does,
// and it's the one screen owners check from a phone (today's schedule,
// adding a quick appointment). So it's exempt from the tablet-only gate;
// everything else (inspections, quotes, sketches, settings) stays tablet-only.
const PHONE_FRIENDLY_PREFIXES = ['/plan']

function isTabletSized() {
  if (typeof window === 'undefined') return true
  return Math.min(window.innerWidth, window.innerHeight) >= MIN_TABLET_DIMENSION
}

export default function TabletGuard({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(isTabletSized)
  const { pathname } = useLocation()

  useEffect(() => {
    function check() {
      setOk(isTabletSized())
    }
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  const exempt = PHONE_FRIENDLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (ok || exempt) return <>{children}</>

  // Phone-sized and not already on a phone-friendly page: don't show a dead
  // end, just take them to the one screen that works on a phone (Plán).
  return <Navigate to="/plan" replace />
}
