import { SHORTCUTS, formatShortcut, type ShortcutId } from '../shortcuts'

/**
 * Inline shortcut hint chip (`⌘N` on macOS, `Ctrl+N` elsewhere). Purely
 * visual — put `aria-keyshortcuts` on the control it describes instead.
 * `onAccent` is for chips sitting on a filled `.btn-accent` button.
 */
export function Kbd({ shortcut, tone = 'default' }: { shortcut: ShortcutId; tone?: 'default' | 'onAccent' }) {
  return (
    <kbd
      className="mono shrink-0"
      style={{
        fontSize: 10,
        lineHeight: 1.4,
        padding: '1px 5px',
        borderRadius: 4,
        ...(tone === 'onAccent'
          ? { color: 'inherit', opacity: 0.7, border: '1px solid currentColor' }
          : { color: 'var(--text-3)', border: '1px solid var(--border-soft)' }),
      }}
      aria-hidden="true"
    >
      {formatShortcut(shortcut)}
    </kbd>
  )
}

/**
 * Fast, styled hover/focus tooltip naming an action and its shortcut — for the
 * few frequent header buttons only. CSS-driven (`.tt-host` in index.css), so it
 * appears after a short delay instead of the native `title` tooltip's ~1s.
 */
export function ShortcutTooltip({ shortcut, children }: {
  shortcut: ShortcutId
  children: React.ReactNode
}) {
  return (
    <span className="tt-host relative inline-flex flex-none">
      {children}
      <span className="tt" aria-hidden="true">
        {SHORTCUTS[shortcut].label}
        <Kbd shortcut={shortcut} />
      </span>
    </span>
  )
}
