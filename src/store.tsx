// Zentraler App-Store: hält alle Builds + Gruppen + die aktuelle Auswahl,
// kapselt sämtliche Mutationen und persistiert automatisch in den localStorage.

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
  type BuildGroup,
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
  groups: BuildGroup[]
  selectedId: string | null
}

type BuildPatch = Partial<
  Pick<Build, 'name' | 'classId' | 'charLink' | 'notes' | 'groupId'>
>

type Action =
  | { type: 'createBuild'; name: string }
  | { type: 'deleteBuild'; buildId: string }
  | { type: 'selectBuild'; buildId: string | null }
  | { type: 'updateBuild'; buildId: string; patch: BuildPatch }
  | { type: 'reorderBuilds'; orderedIds: string[] }
  | { type: 'addMilestone'; buildId: string }
  | { type: 'deleteMilestone'; buildId: string; milestoneId: string }
  | {
      type: 'updateMilestone'
      buildId: string
      milestoneId: string
      patch: Partial<Omit<Milestone, 'id'>>
    }
  | { type: 'reorderMilestones'; buildId: string; orderedIds: string[] }
  | { type: 'createGroup'; name: string }
  | { type: 'renameGroup'; groupId: string; name: string }
  | { type: 'deleteGroup'; groupId: string }

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

/** Sortiert eine Liste nach einer vorgegebenen ID-Reihenfolge; nicht genannte
 *  Einträge werden hinten stabil angehängt. */
function applyOrder<T extends { id: string }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(items.map((it) => [it.id, it]))
  const result: T[] = []
  for (const id of orderedIds) {
    const it = byId.get(id)
    if (it) {
      result.push(it)
      byId.delete(id)
    }
  }
  for (const it of items) if (byId.has(it.id)) result.push(it)
  return result
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'createBuild': {
      const ts = now()
      const build: Build = {
        id: newId(),
        name: action.name.trim() || 'Neuer Build',
        classId: null,
        charLink: '',
        notes: '',
        groupId: null,
        // Ein Build ohne Milestone ergibt keinen Sinn -> gleich einen anlegen.
        milestones: [newMilestone()],
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
    case 'reorderBuilds':
      return { ...state, builds: applyOrder(state.builds, action.orderedIds) }
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
    case 'reorderMilestones':
      return mapBuild(state, action.buildId, (b) => ({
        ...b,
        milestones: applyOrder(b.milestones, action.orderedIds),
      }))
    case 'createGroup': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        groups: [...state.groups, { id: newId(), name }],
      }
    }
    case 'renameGroup':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, name: action.name.trim() || g.name }
            : g,
        ),
      }
    case 'deleteGroup':
      return {
        ...state,
        groups: state.groups.filter((g) => g.id !== action.groupId),
        // Builds der Gruppe werden "ohne Gruppe".
        builds: state.builds.map((b) =>
          b.groupId === action.groupId ? { ...b, groupId: null } : b,
        ),
      }
    default:
      return state
  }
}

function init(): State {
  const data = loadData()
  return {
    builds: data.builds,
    groups: data.groups,
    selectedId: data.builds[0]?.id ?? null,
  }
}

interface Store {
  builds: Build[]
  groups: BuildGroup[]
  selectedId: string | null
  selectedBuild: Build | null
  createBuild: (name: string) => void
  deleteBuild: (buildId: string) => void
  selectBuild: (buildId: string | null) => void
  updateBuild: (buildId: string, patch: BuildPatch) => void
  reorderBuilds: (orderedIds: string[]) => void
  addMilestone: (buildId: string) => void
  deleteMilestone: (buildId: string, milestoneId: string) => void
  updateMilestone: (
    buildId: string,
    milestoneId: string,
    patch: Partial<Omit<Milestone, 'id'>>,
  ) => void
  reorderMilestones: (buildId: string, orderedIds: string[]) => void
  createGroup: (name: string) => void
  renameGroup: (groupId: string, name: string) => void
  deleteGroup: (groupId: string) => void
  newSkill: () => SkillEntry
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  // Automatisch persistieren, wann immer sich Builds oder Gruppen ändern.
  useEffect(() => {
    saveData({ version: 1, builds: state.builds, groups: state.groups })
  }, [state.builds, state.groups])

  const store = useMemo<Store>(
    () => ({
      builds: state.builds,
      groups: state.groups,
      selectedId: state.selectedId,
      selectedBuild:
        state.builds.find((b) => b.id === state.selectedId) ?? null,
      createBuild: (name) => dispatch({ type: 'createBuild', name }),
      deleteBuild: (buildId) => dispatch({ type: 'deleteBuild', buildId }),
      selectBuild: (buildId) => dispatch({ type: 'selectBuild', buildId }),
      updateBuild: (buildId, patch) =>
        dispatch({ type: 'updateBuild', buildId, patch }),
      reorderBuilds: (orderedIds) =>
        dispatch({ type: 'reorderBuilds', orderedIds }),
      addMilestone: (buildId) => dispatch({ type: 'addMilestone', buildId }),
      deleteMilestone: (buildId, milestoneId) =>
        dispatch({ type: 'deleteMilestone', buildId, milestoneId }),
      updateMilestone: (buildId, milestoneId, patch) =>
        dispatch({ type: 'updateMilestone', buildId, milestoneId, patch }),
      reorderMilestones: (buildId, orderedIds) =>
        dispatch({ type: 'reorderMilestones', buildId, orderedIds }),
      createGroup: (name) => dispatch({ type: 'createGroup', name }),
      renameGroup: (groupId, name) =>
        dispatch({ type: 'renameGroup', groupId, name }),
      deleteGroup: (groupId) => dispatch({ type: 'deleteGroup', groupId }),
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
