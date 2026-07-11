import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { decodeBuild, shareCodeFromHash } from '../share'

/** Beim Laden: enthält die URL einen geteilten Build (#build=…), wird er importiert,
 *  ausgewählt und der Hash entfernt (damit ein Reload ihn nicht erneut anlegt). */
export function ShareImport() {
  const { importBuild } = useStore()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    const code = shareCodeFromHash(location.hash)
    if (!code) return
    history.replaceState(null, '', location.pathname + location.search)
    const build = decodeBuild(code)
    if (build) importBuild(build)
    else console.warn('BuildPlaner: Share-Link ungültig – Build nicht importiert.')
  }, [importBuild])

  return null
}
