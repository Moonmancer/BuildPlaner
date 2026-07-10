// Zentraler App-Store.
//
// Persistenz-Modell (Dirty-State):
//  - Build-INHALT (name, classId, charLink, notes, milestones inkl. stats/skills) wird in einer
//    Draft-Kopie des ausgewählten Builds bearbeitet und erst per Save committet. dirty zeigt an,
//    ob der Draft ungespeicherte Änderungen hat.
//  - STRUKTUR-Aktionen (Build/Gruppe anlegen/löschen, Sortierung, Gruppen-Zuordnung) wirken sofort
//    auf die committete builds/groups-Liste und werden automatisch persistiert.

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

function clone<T>(value: T): T {
  return structuredClone(value)
}

interface State {
  builds: Build[] // committet + persistiert
  groups: BuildGroup[]
  selectedId: string | null
  draft: Build | null // Arbeitskopie des ausgewählten Builds
  dirty: boolean
}

type BuildContentPatch = Partial<
  Pick<Build, 'name' | 'classId' | 'charLink' | 'notes'>
>

type Action =
  | { type: 'createBuild'; name: string }
  | { type: 'deleteBuild'; buildId: string }
  | { type: 'selectBuild'; buildId: string | null }
  | { type: 'reorderBuilds'; orderedIds: string[] }
  | { type: 'setBuildGroup'; buildId: string; groupId: string | null }
  // Inhaltliche Edits -> Draft
  | { type: 'updateDraft'; patch: BuildContentPatch }
  | { type: 'addMilestone' }
  | { type: 'deleteMilestone'; milestoneId: string }
  | {
      type: 'updateMilestone'
      milestoneId: string
      patch: Partial<Omit<Milestone, 'id'>>
    }
  | { type: 'reorderMilestones'; orderedIds: string[] }
  | { type: 'saveDraft' }
  | { type: 'discardDraft' }
  // Gruppen (Struktur)
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

function newBuild(name: string): Build {
  const ts = now()
  return {
    id: newId(),
    name: name.trim() || 'Neuer Build',
    classId: null,
    charLink: '',
    notes: '',
    groupId: null,
    milestones: [newMilestone()],
    createdAt: ts,
    updatedAt: ts,
  }
}

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

/** Bearbeitet die Draft-Milestones und markiert dirty. */
function editDraftMilestones(
  state: State,
  fn: (ms: Milestone[]) => Milestone[],
): State {
  if (!state.draft) return state
  return {
    ...state,
    draft: { ...state.draft, milestones: fn(state.draft.milestones) },
    dirty: true,
  }
}

function draftFor(builds: Build[], id: string | null): Build | null {
  const b = builds.find((x) => x.id === id)
  return b ? clone(b) : null
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'createBuild': {
      const build = newBuild(action.name)
      return {
        ...state,
        builds: [build, ...state.builds],
        selectedId: build.id,
        draft: clone(build),
        dirty: false,
      }
    }
    case 'deleteBuild': {
      const builds = state.builds.filter((b) => b.id !== action.buildId)
      if (state.selectedId !== action.buildId) return { ...state, builds }
      const selectedId = builds[0]?.id ?? null
      return {
        ...state,
        builds,
        selectedId,
        draft: draftFor(builds, selectedId),
        dirty: false,
      }
    }
    case 'selectBuild':
      return {
        ...state,
        selectedId: action.buildId,
        draft: draftFor(state.builds, action.buildId),
        dirty: false,
      }
    case 'reorderBuilds':
      return { ...state, builds: applyOrder(state.builds, action.orderedIds) }
    case 'setBuildGroup': {
      // Struktur: sofort auf builds; Draft (falls betroffen) synchron halten.
      const builds = state.builds.map((b) =>
        b.id === action.buildId
          ? { ...b, groupId: action.groupId, updatedAt: now() }
          : b,
      )
      const draft =
        state.draft && state.draft.id === action.buildId
          ? { ...state.draft, groupId: action.groupId }
          : state.draft
      return { ...state, builds, draft }
    }
    case 'updateDraft':
      if (!state.draft) return state
      return {
        ...state,
        draft: { ...state.draft, ...action.patch },
        dirty: true,
      }
    case 'addMilestone':
      return editDraftMilestones(state, (ms) => [...ms, newMilestone()])
    case 'deleteMilestone':
      return editDraftMilestones(state, (ms) =>
        ms.filter((m) => m.id !== action.milestoneId),
      )
    case 'updateMilestone':
      return editDraftMilestones(state, (ms) =>
        ms.map((m) =>
          m.id === action.milestoneId ? { ...m, ...action.patch } : m,
        ),
      )
    case 'reorderMilestones':
      return editDraftMilestones(state, (ms) =>
        applyOrder(ms, action.orderedIds),
      )
    case 'saveDraft': {
      if (!state.draft || !state.dirty) return state
      const committed = { ...state.draft, updatedAt: now() }
      return {
        ...state,
        builds: state.builds.map((b) =>
          b.id === committed.id ? committed : b,
        ),
        draft: clone(committed),
        dirty: false,
      }
    }
    case 'discardDraft':
      return {
        ...state,
        draft: draftFor(state.builds, state.selectedId),
        dirty: false,
      }
    case 'createGroup': {
      const name = action.name.trim()
      if (!name) return state
      return { ...state, groups: [...state.groups, { id: newId(), name }] }
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
  const selectedId = data.builds[0]?.id ?? null
  return {
    builds: data.builds,
    groups: data.groups,
    selectedId,
    draft: draftFor(data.builds, selectedId),
    dirty: false,
  }
}

interface Store {
  builds: Build[]
  groups: BuildGroup[]
  selectedId: string | null
  /** Arbeitskopie des ausgewählten Builds (Bearbeitung erfolgt hier). */
  draft: Build | null
  dirty: boolean
  createBuild: (name: string) => void
  deleteBuild: (buildId: string) => void
  selectBuild: (buildId: string | null) => void
  reorderBuilds: (orderedIds: string[]) => void
  setBuildGroup: (buildId: string, groupId: string | null) => void
  updateDraft: (patch: BuildContentPatch) => void
  addMilestone: () => void
  deleteMilestone: (milestoneId: string) => void
  updateMilestone: (
    milestoneId: string,
    patch: Partial<Omit<Milestone, 'id'>>,
  ) => void
  reorderMilestones: (orderedIds: string[]) => void
  saveDraft: () => void
  discardDraft: () => void
  createGroup: (name: string) => void
  renameGroup: (groupId: string, name: string) => void
  deleteGroup: (groupId: string) => void
  newSkill: () => SkillEntry
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  // Nur committete Struktur (builds/groups) wird persistiert. Draft-Edits ändern
  // diese nicht und lösen daher kein Speichern aus – erst saveDraft schreibt.
  useEffect(() => {
    saveData({ version: 1, builds: state.builds, groups: state.groups })
  }, [state.builds, state.groups])

  const store = useMemo<Store>(
    () => ({
      builds: state.builds,
      groups: state.groups,
      selectedId: state.selectedId,
      draft: state.draft,
      dirty: state.dirty,
      createBuild: (name) => dispatch({ type: 'createBuild', name }),
      deleteBuild: (buildId) => dispatch({ type: 'deleteBuild', buildId }),
      selectBuild: (buildId) => dispatch({ type: 'selectBuild', buildId }),
      reorderBuilds: (orderedIds) =>
        dispatch({ type: 'reorderBuilds', orderedIds }),
      setBuildGroup: (buildId, groupId) =>
        dispatch({ type: 'setBuildGroup', buildId, groupId }),
      updateDraft: (patch) => dispatch({ type: 'updateDraft', patch }),
      addMilestone: () => dispatch({ type: 'addMilestone' }),
      deleteMilestone: (milestoneId) =>
        dispatch({ type: 'deleteMilestone', milestoneId }),
      updateMilestone: (milestoneId, patch) =>
        dispatch({ type: 'updateMilestone', milestoneId, patch }),
      reorderMilestones: (orderedIds) =>
        dispatch({ type: 'reorderMilestones', orderedIds }),
      saveDraft: () => dispatch({ type: 'saveDraft' }),
      discardDraft: () => dispatch({ type: 'discardDraft' }),
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
