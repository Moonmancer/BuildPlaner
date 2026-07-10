// Zentraler App-Store.
//
// Persistenz-Modell (Dirty-State):
//  - Build-INHALT (name, classId, charLink, notes, milestones) wird in einer Draft-Kopie des
//    ausgewählten Builds bearbeitet und erst per Save committet. dirty zeigt ungespeicherte Edits.
//  - STRUKTUR (Build/Gruppe anlegen/löschen, Sortierung, Gruppen-Zuordnung, Gruppen-Baum) wirkt
//    sofort auf die committete builds/groups-Liste und wird automatisch persistiert.
//  - Gruppen-Mitgliedschaft (groupIds) liegt NUR auf dem committeten Build; Save überschreibt nur
//    Inhaltsfelder und lässt groupIds unberührt.

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
  builds: Build[]
  groups: BuildGroup[]
  selectedId: string | null
  draft: Build | null
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
  | { type: 'toggleBuildGroup'; buildId: string; groupId: string }
  | { type: 'setBuildGroups'; buildId: string; groupIds: string[] }
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
  | { type: 'createGroup'; name: string; parentId: string | null }
  | { type: 'renameGroup'; groupId: string; name: string }
  | { type: 'setGroupParent'; groupId: string; parentId: string | null }
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
    groupIds: [],
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

function mapBuild(state: State, id: string, fn: (b: Build) => Build): State {
  return {
    ...state,
    builds: state.builds.map((b) =>
      b.id === id ? { ...fn(b), updatedAt: now() } : b,
    ),
  }
}

/** true, wenn `maybeChild` ein Nachfahre von `groupId` ist (für Zyklus-Schutz). */
function isDescendant(
  groups: BuildGroup[],
  groupId: string,
  maybeChild: string,
): boolean {
  let cur = groups.find((g) => g.id === maybeChild)
  const seen = new Set<string>()
  while (cur && cur.parentId && !seen.has(cur.id)) {
    if (cur.parentId === groupId) return true
    seen.add(cur.id)
    cur = groups.find((g) => g.id === cur!.parentId)
  }
  return false
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
    case 'toggleBuildGroup':
      return mapBuild(state, action.buildId, (b) => ({
        ...b,
        groupIds: b.groupIds.includes(action.groupId)
          ? b.groupIds.filter((g) => g !== action.groupId)
          : [...b.groupIds, action.groupId],
      }))
    case 'setBuildGroups':
      return mapBuild(state, action.buildId, (b) => ({
        ...b,
        groupIds: [...new Set(action.groupIds)],
      }))
    case 'updateDraft':
      if (!state.draft) return state
      return { ...state, draft: { ...state.draft, ...action.patch }, dirty: true }
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
      const d = state.draft
      return {
        ...state,
        // Nur Inhaltsfelder committen; groupIds/createdAt bleiben vom committeten Build.
        builds: state.builds.map((b) =>
          b.id === d.id
            ? {
                ...b,
                name: d.name,
                classId: d.classId,
                charLink: d.charLink,
                notes: d.notes,
                milestones: d.milestones,
                updatedAt: now(),
              }
            : b,
        ),
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
      return {
        ...state,
        groups: [
          ...state.groups,
          { id: newId(), name, parentId: action.parentId },
        ],
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
    case 'setGroupParent': {
      // Kein Selbstbezug und kein Zyklus (Elter darf kein Nachfahre sein).
      if (
        action.parentId === action.groupId ||
        (action.parentId &&
          isDescendant(state.groups, action.groupId, action.parentId))
      )
        return state
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, parentId: action.parentId } : g,
        ),
      }
    }
    case 'deleteGroup': {
      const deleted = state.groups.find((g) => g.id === action.groupId)
      const promoteTo = deleted?.parentId ?? null
      return {
        ...state,
        groups: state.groups
          .filter((g) => g.id !== action.groupId)
          .map((g) =>
            g.parentId === action.groupId ? { ...g, parentId: promoteTo } : g,
          ),
        builds: state.builds.map((b) =>
          b.groupIds.includes(action.groupId)
            ? { ...b, groupIds: b.groupIds.filter((g) => g !== action.groupId) }
            : b,
        ),
      }
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
  /** Committeter ausgewählter Build (für strukturelle Felder wie groupIds). */
  selectedBuild: Build | null
  /** Arbeitskopie des ausgewählten Builds (Inhalt wird hier bearbeitet). */
  draft: Build | null
  dirty: boolean
  createBuild: (name: string) => void
  deleteBuild: (buildId: string) => void
  selectBuild: (buildId: string | null) => void
  reorderBuilds: (orderedIds: string[]) => void
  toggleBuildGroup: (buildId: string, groupId: string) => void
  setBuildGroups: (buildId: string, groupIds: string[]) => void
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
  createGroup: (name: string, parentId?: string | null) => void
  renameGroup: (groupId: string, name: string) => void
  setGroupParent: (groupId: string, parentId: string | null) => void
  deleteGroup: (groupId: string) => void
  newSkill: () => SkillEntry
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

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
      draft: state.draft,
      dirty: state.dirty,
      createBuild: (name) => dispatch({ type: 'createBuild', name }),
      deleteBuild: (buildId) => dispatch({ type: 'deleteBuild', buildId }),
      selectBuild: (buildId) => dispatch({ type: 'selectBuild', buildId }),
      reorderBuilds: (orderedIds) =>
        dispatch({ type: 'reorderBuilds', orderedIds }),
      toggleBuildGroup: (buildId, groupId) =>
        dispatch({ type: 'toggleBuildGroup', buildId, groupId }),
      setBuildGroups: (buildId, groupIds) =>
        dispatch({ type: 'setBuildGroups', buildId, groupIds }),
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
      createGroup: (name, parentId = null) =>
        dispatch({ type: 'createGroup', name, parentId }),
      renameGroup: (groupId, name) =>
        dispatch({ type: 'renameGroup', groupId, name }),
      setGroupParent: (groupId, parentId) =>
        dispatch({ type: 'setGroupParent', groupId, parentId }),
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
