// Dispatcher: erkennt anhand der URL, welcher fremde Calculator vorliegt, und
// dekodiert zu einem (Inhalts-)Build. Phase 5.

import type { Build } from './types'
import { decodeArcadiaToBuild } from './arcadia'
import { decodeIrowikiToBuild } from './irowiki'

/** Dekodiert einen beliebigen unterstützten Calculator-Link. Null, wenn keiner passt. */
export function decodeCalcUrl(input: string): Build | null {
  const s = input.trim()
  if (!s) return null
  if (/arcadia-online\.org/.test(s) || /#k/.test(s)) {
    const b = decodeArcadiaToBuild(s)
    if (b) return b
  }
  if (/irowiki\.org/.test(s) && /[?&]build=/.test(s)) {
    const b = decodeIrowikiToBuild(s)
    if (b) return b
  }
  // Fallback: beide versuchen.
  return decodeArcadiaToBuild(s) ?? decodeIrowikiToBuild(s)
}
