import { ModalShell } from './ModalShell'
import { Kbd } from './Kbd'
import { SHORTCUTS, SHORTCUT_GROUPS, type ShortcutId } from '../shortcuts'

/** Overlay listing every Shortcut, generated from the registry. */
export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const ids = Object.keys(SHORTCUTS) as ShortcutId[]

  return (
    <ModalShell title="Keyboard Shortcuts" onClose={onClose}>
      <div className="p-6 flex flex-col gap-5">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group}>
            <h3
              className="text-xs font-medium uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {group}
            </h3>
            <ul className="flex flex-col">
              {ids.filter((id) => SHORTCUTS[id].group === group).map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between py-1.5"
                  style={{ fontSize: 12.5, color: 'var(--text-1)', borderBottom: '1px solid var(--border-dim)' }}
                >
                  {SHORTCUTS[id].label}
                  <Kbd shortcut={id} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ModalShell>
  )
}
