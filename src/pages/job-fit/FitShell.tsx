import { Outlet } from "react-router-dom"
import FitNav from "./FitNav"

/**
 * Pathless layout route that puts `FitNav` above every Job-Fit page.
 *
 * Why a layout route rather than putting the nav in `FitPageHeader`: the nav
 * needs auth + entitlement context, and a shared presentational header does not
 * have it — an earlier attempt to nest it there broke all eleven existing
 * Job-Fit page tests, which render pages bare. Here the nav sits inside the
 * vertical's provider tree, every page (including future ones) gets it for free,
 * and the pages and their tests stay untouched.
 *
 * Core's `VerticalShell` still owns the chrome and the entitlement gate; this
 * only adds in-vertical navigation beneath it.
 */
export default function FitShell() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <FitNav />
      <Outlet />
    </div>
  )
}
