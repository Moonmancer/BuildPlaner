// Zentraler App-Store: hält alle Builds + die aktuelle Auswahl, kapselt sämtliche
// Mutationen und persistiert automatisch in den localStorage.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  emptyStats,
  type Build,
  type Milestone,
  type SkillEntry,
} from './types'
import { loadData, saveData } from './storage'

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function now(): string {
  return new Date().toISOString()
}

interface State {
  builds: Build[]
  selectedId: string | null
}

type Action =
  | { type: 'createBuild'; name: string }
  | { type: 'deleteBuild'; buildId: string }
  | { type: 'selectBuild'; buildId: string | null }
  | {
      type: 'updateBuild'
      buildId: string
      patch: Partial<Pick<Build, 'name' | 'jobClass' | 'notes'>>
    }
  | { type: 'addMilestone'; buildId: string }
  | { type: 'deleteMilestone'; buildId: string; milestoneId: string }
  | {
      type: 'updateMilestone'
      buildId: string
      milestoneId: string
      patch: Partial<Omit<Milestone, 'id'>>
    }

function newMilestone(): Milestone {
  return {
    id: newId(),
    label: 'Neuer Milestone',
    baseLevel: 1,
    jobLevel: 1,
    stats: emptyStats(),
    skills: [],
  }
}

/** Wendet eine Änderung auf einen Build an und setzt updatedAt. */
function mapBuild(
  state: State,
  buildId: string,
  fn: (b: Build) => Build,
): State {
  return {
    ...state,
    builds: state.builds.map((b) =>
      b.id === buildId ? { ...fn(b), updatedAt: now() } : b,
    ),
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'createBuild': {
      const ts = now()
      const build: Build = {
        id: newId(),
        name: action.name.trim() || 'Neuer Build',
        jobClass: '',
        notes: '',
        milestones: [],
        createdAt: ts,
        updatedAt: ts,
      }
      return {
        ...state,
        builds: [build, ...state.builds],
        selectedId: build.id,
      }
    }
    case 'deleteBuild': {
      const builds = state.builds.filter((b) => b.id !== action.buildId)
      const selectedId =
        state.selectedId === action.buildId
          ? (builds[0]?.id ?? null)
          : state.selectedId
      return { ...state, builds, selectedId }
    }
    case 'selectBuild':
      return { ...state, selectedId: action.buildId }
    case 'updateBuild':
      return mapBuild(state, action.buildId, (b) => ({ ...b, ...action.patch }))
    case 'addMilestone':
      return mapBuild(state, action.buildId, (b) => ({
        ...b,
        milestones: [...b.milestones, newMilestone()],
      }))
    case 'deleteMilestone':
      return mapBuild(state, action.buildId, (b) => ({
        ...b,
        milestones: b.milestones.filter((m) => m.id !== action.milestoneId),
      }))
    case 'updateMilestone':
      return mapBuild(state, action.buildId, (b) => ({
        ...b,
        milestones: b.milestones.map((m) =>
          m.id === action.milestoneId ? { ...m, ...action.patch } : m,
        ),
      }))
    default:
      return state
  }
}

function init(): State {
  const data = loadData()
  return { builds: data.builds, selectedId: data.builds[0]?.id ?? null }
}

interface Store {
  builds: Build[]
  selectedId: string | null
  selectedBuild: Build | null
  createBuild: (name: string) => void
  deleteBuild: (buildId: string) => void
  selectBuild: (buildId: string | null) => void
  updateBuild: (
    buildId: string,
    patch: Partial<Pick<Build, 'name' | 'jobClass' | 'notes'>>,
  ) => void
  addMilestone: (buildId: string) => void
  deleteMilestone: (buildId: string, milestoneId: string) => void
  updateMilestone: (
    buildId: string,
    milestoneId: string,
    patch: Partial<Omit<Milestone, 'id'>>,
  ) => void
  newSkill: () => SkillEntry
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  // Automatisch persistieren, wann immer sich die Builds ändern.
  useEffect(() => {
    saveData({ version: 1, builds: state.builds })
  }, [state.builds])

  const store = useMemo<Store>(
    () => ({
      builds: state.builds,
      selectedId: state.selectedId,
      selectedBuild:
        state.builds.find((b) => b.id === state.selectedId) ?? null,
      createBuild: (name) => dispatch({ type: 'createBuild', name }),
      deleteBuild: (buildId) => dispatch({ type: 'deleteBuild', buildId }),
      selectBuild: (buildId) => dispatch({ type: 'selectBuild', buildId }),
      updateBuild: (buildId, patch) =>
        dispatch({ type: 'updateBuild', buildId, patch }),
      addMilestone: (buildId) => dispatch({ type: 'addMilestone', buildId }),
      deleteMilestone: (buildId, milestoneId) =>
        dispatch({ type: 'deleteMilestone', buildId, milestoneId }),
      updateMilestone: (buildId, milestoneId, patch) =>
        dispatch({ type: 'updateMilestone', buildId, milestoneId, patch }),
      newSkill: () => ({ id: newId(), name: '', level: 1 }),
    }),
    [state],
  )

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  )
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore muss innerhalb von StoreProvider stehen')
  return store
}
