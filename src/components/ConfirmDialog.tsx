import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

/** Stellt eine imperative confirm()-Funktion bereit, die ein eigenes Modal
 *  anzeigt und ein Promise<boolean> zurückgibt. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOptions(null)
  }, [])

  useEffect(() => {
    if (!options) return
    confirmBtnRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false)
      else if (e.key === 'Enter') close(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [options, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="modal-backdrop"
          onMouseDown={() => close(false)}
          role="presentation"
        >
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-label={options.title}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">{options.title}</h3>
            {options.message && <p className="modal-message">{options.message}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => close(false)}
              >
                {options.cancelLabel ?? 'Abbrechen'}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                className={options.danger ? 'btn-danger' : ''}
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm)
    throw new Error('useConfirm muss innerhalb von ConfirmProvider stehen')
  return confirm
}
