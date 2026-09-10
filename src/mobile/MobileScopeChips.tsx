import { useEffect, useRef } from 'react'
import type { Counts, Folder, Tag } from '../types'
import type { MobileSelection } from './MobileApp'
import { IconAll, IconClose, IconFolder, IconInbox } from '../components/icons'

interface MobileScopeChipsProps {
  selection: MobileSelection
  folders: Folder[]
  tags: Tag[]
  counts: Counts
  onSelect: (selection: MobileSelection) => void
}

function chipKey(sel: MobileSelection): string {
  return sel.type === 'folder' || sel.type === 'tag' ? `${sel.type}:${sel.id}` : sel.type
}

interface ChipProps {
  active: boolean
  label: string
  icon?: React.ReactNode
  count?: number
  onPress: () => void
  /** Tapping the active chip clears it (back to "All"); `clearable` gates the
      × glyph so the always-on "All" chip never advertises a clear action. */
  clearable?: boolean
}

function Chip({ active, label, icon, count, onPress, clearable = true }: ChipProps) {
  const ref = useRef<HTMLButtonElement>(null)

  // Keep the chip for the current scope in view: a tag tapped from a card
  // deep in the alphabet would otherwise activate off-screen.
  useEffect(() => {
    if (!active) return
    ref.current?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [active])

  const showClear = active && clearable
  return (
    <button
      ref={ref}
      type="button"
      className={`mobile-chip${active ? ' is-active' : ''}`}
      onClick={onPress}
      aria-pressed={active}
      aria-label={showClear ? `Clear filter ${label}` : label}
    >
      <span className="mobile-chip-pill">
        {icon}
        <span className="mobile-chip-label">{label}</span>
        {count !== undefined && !showClear && (
          <span className="mobile-chip-count mono tabnum" aria-hidden="true">{count}</span>
        )}
        {showClear && (
          <span className="mobile-chip-clear" aria-hidden="true">
            <IconClose size={10} />
          </span>
        )}
      </span>
    </button>
  )
}

// Horizontal quick-switch row under the search box: All · Inbox · tags.
// The active chip is the only place besides the drawer that shows which
// scope the list is in, and tapping it returns to "All" — so the active
// scope always has a visible one-tap exit. Folders don't fit a flat chip
// row (they nest), so a folder scope appears as a transient chip at the
// front while active and disappears once cleared. Bin is management-only;
// MobileHeader doesn't render this row there.
export function MobileScopeChips({ selection, folders, tags, counts, onSelect }: MobileScopeChipsProps) {
  const activeKey = chipKey(selection)
  const clear = () => onSelect({ type: 'all' })

  // Alphabetical (backend order), but the active tag moves to the front of
  // the tag group so it is visible without scrolling.
  const activeTagId = selection.type === 'tag' ? selection.id : null
  const orderedTags = activeTagId
    ? [...tags.filter((t) => t.id === activeTagId), ...tags.filter((t) => t.id !== activeTagId)]
    : tags

  const activeFolder = selection.type === 'folder' ? folders.find((f) => f.id === selection.id) : undefined

  return (
    <div className="mobile-chips" role="group" aria-label="Quick filters">
      {activeFolder && (
        <Chip
          active
          label={activeFolder.name}
          icon={<IconFolder size={13} />}
          onPress={clear}
        />
      )}
      <Chip
        active={activeKey === 'all'}
        clearable={false}
        label="All"
        icon={<IconAll size={13} />}
        onPress={() => onSelect({ type: 'all' })}
      />
      <Chip
        active={activeKey === 'inbox'}
        label="Inbox"
        icon={<IconInbox size={13} />}
        count={counts.inbox}
        onPress={activeKey === 'inbox' ? clear : () => onSelect({ type: 'inbox' })}
      />
      {orderedTags.map((tag) => {
        const active = tag.id === activeTagId
        return (
          <Chip
            key={tag.id}
            active={active}
            label={tag.name}
            icon={<span className="mobile-chip-dot" style={{ background: tag.color }} aria-hidden="true" />}
            count={tag.bookmark_count}
            onPress={active ? clear : () => onSelect({ type: 'tag', id: tag.id })}
          />
        )
      })}
    </div>
  )
}
