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
  /** Optionaler dritter Button (z.B. „Verwerfen"). */
  thirdLabel?: string
  danger?: boolean
}

type Choice = 'confirm' | 'third' | 'cancel'

interface ConfirmApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  confirmChoice: (options: ConfirmOptions) => Promise<Choice>
}

const ConfirmContext = createContext<ConfirmApi | null>(null)

/** Stellt imperative confirm()/confirmChoice()-Funktionen bereit, die ein eigenes
 *  Modal anzeigen. confirm liefert boolean, confirmChoice ein 3-Wege-Ergebnis. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((c: Choice) => void) | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  const ask = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    return new Promise<Choice>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((choice: Choice) => {
    resolver.current?.(choice)
    resolver.current = null
    setOptions(null)
  }, [])

  const api = useRef<ConfirmApi>({
    confirm: (opts) => ask(opts).then((c) => c === 'confirm'),
    confirmChoice: (opts) => ask(opts),
  })

  useEffect(() => {
    if (!options) return
    confirmBtnRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close('cancel')
      else if (e.key === 'Enter') close('confirm')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [options, close])

  return (
    <ConfirmContext.Provider value={api.current}>
      {children}
      {options && (
        <div
          className="modal-backdrop"
          onMouseDown={() => close('cancel')}
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
            {options.message && (
              <p className="modal-message">{options.message}</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => close('cancel')}
              >
                {options.cancelLabel ?? 'Abbrechen'}
              </button>
              {options.thirdLabel && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => close('third')}
                >
                  {options.thirdLabel}
                </button>
              )}
              <button
                type="button"
                ref={confirmBtnRef}
                className={options.danger ? 'btn-danger' : ''}
                onClick={() => close('confirm')}
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

function useApi(): ConfirmApi {
  const api = useContext(ConfirmContext)
  if (!api)
    throw new Error('useConfirm muss innerhalb von ConfirmProvider stehen')
  return api
}

export function useConfirm() {
  return useApi().confirm
}

export function useConfirmChoice() {
  return useApi().confirmChoice
}
