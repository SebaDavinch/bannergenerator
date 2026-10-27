import { forwardRef } from 'react'
import { useLogos } from '../lib/logos'
import { useStore } from '../state/store'
import type { ModeDataMap, ModeId } from '../types'
import { projectById, useProjects } from '../data/projects'
import { brandTheme } from './brand'
import { ChallengeBanner, CollabBanner, FocusBanner, GoalBanner, RosterBanner, SlottedBanner, TourBanner, VatsimBanner } from './templates'

/** The 1920×1080 banner itself. Rendered once in the preview (scaled) and exported as-is. */
export const BannerStage = forwardRef<HTMLDivElement, { editable?: boolean }>(function BannerStage({ editable }, ref) {
  const { state, update } = useStore()
  const { logos } = useLogos()
  const mode = state.mode
  useProjects()
  const project = projectById(state.brand)
  const brand = brandTheme(project)
  const common = { brand, project, lang: state.bannerLang, mode }
  const patch = <M extends ModeId>(m: M) => (editable ? (p: Partial<ModeDataMap[M]>) => update(m, p) : undefined)

  let body: React.ReactNode = null
  switch (mode) {
    case 'focus-airport': body = <FocusBanner {...common} data={state.data[mode]} patch={patch(mode)} />; break
    case 'tour': body = <TourBanner {...common} data={state.data[mode]} patch={patch(mode)} />; break
    case 'roster':
    case 'curated-roster': body = <RosterBanner {...common} data={state.data[mode]} patch={patch(mode)} />; break
    case 'community-challenge': body = <ChallengeBanner {...common} data={state.data[mode]} patch={patch(mode)} />; break
    case 'community-goal': body = <GoalBanner {...common} data={state.data[mode]} patch={patch(mode)} />; break
    case 'slotted': body = <SlottedBanner {...common} data={state.data[mode]} patch={patch(mode)} />; break
    case 'event': body = <CollabBanner {...common} data={state.data[mode]} patch={patch(mode)} />; break
    case 'vatsim-region': body = <VatsimBanner {...common} data={state.data[mode]} patch={patch(mode)} logos={logos} />; break
  }
  return (
    <div ref={ref} className={`banner banner--${mode} banner--${state.brand}`} data-lang={state.bannerLang}>
      {body}
    </div>
  )
})
