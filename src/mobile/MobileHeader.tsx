import { useEffect, useState, type Ref } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { SearchBox, type SearchBoxHandle } from '../components/SearchBox'
import {
  IconChevronRight,
  IconFilter,
  IconFolder,
  IconInbox,
  IconLayoutGrid,
  IconLayoutList,
  IconMoon,
  IconRefresh,
  IconSettings,
  IconSun,
  IconTrash,
} from '../components/icons'
import type { Counts, Folder, Tag, ViewMode } from '../types'
import type { MobileSelection } from './MobileApp'
import { MobileScopeChips } from './MobileScopeChips'

// Mirrors `pgsync::NeonStatus` — only the field the header needs.
interface NeonStatus {
  enabled: boolean
}

interface MobileHeaderProps {
  /** Receives the debounced search query from the reused `SearchBox`. */
  onSearch: (value: string) => void
  /** Imperative handle so the shell can clear the search field. */
  searchRef?: Ref<SearchBoxHandle>
  viewMode: ViewMode
  onToggleView: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onOpenSettings: () => void
  /** The filter button renders only when provided — opens the FilterDrawer. */
  onOpenFilter?: () => void
  /** True while a sync cycle runs (from the `backup-syncing` event, manual or automatic). */
  syncing: boolean
  /** Current navigation scope, shown in the title and chip row. */
  selection: MobileSelection
  folders: Folder[]
  tags: Tag[]
  counts: Counts
  onSelect: (selection: MobileSelection) => void
  /** Rows in the current list; null while the first load is pending. */
  resultCount: number | null
}

interface ScopeInfo {
  label: string
  icon: React.ReactNode | null
}

function scopeInfo(selection: MobileSelection, folders: Folder[], tags: Tag[]): ScopeInfo {
  switch (selection.type) {
    case 'all':
      return { label: 'All bookmarks', icon: null }
    case 'inbox':
      return { label: 'Inbox', icon: <IconInbox size={15} /> }
    case 'bin':
      return { label: 'Bin', icon: <IconTrash size={15} /> }
    case 'folder':
      return {
        label: folders.find((f) => f.id === selection.id)?.name ?? 'Folder',
        icon: <IconFolder size={15} />,
      }
    case 'tag': {
      const tag = tags.find((t) => t.id === selection.id)
      return {
        label: tag?.name ?? 'Tag',
        icon: tag ? <span className="mobile-chip-dot" style={{ background: tag.color }} /> : null,
      }
    }
  }
}

/**
 * Top chrome of the mobile shell: scope title row (`Ferrico › <scope>` with
 * result count, plus refresh / theme / view / settings buttons), a full-width
 * search row, and the quick-filter chip row. The refresh button only appears
 * once the device is paired (Neon sync enabled) and triggers a full
 * `neon_sync_now` cycle; its spinner and disabled state are driven by the
 * event-sourced `syncing` prop so automatic syncs show the same feedback.
 * "Last sync" lives on the Settings screen, not here.
 */
export function MobileHeader({
  onSearch,
  searchRef,
  viewMode,
  onToggleView,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenFilter,
  syncing,
  selection,
  folders,
  tags,
  counts,
  onSelect,
  resultCount,
}: MobileHeaderProps) {
  const [backup, setBackup] = useState<NeonStatus | null>(null)

  // Load sync status on mount and again after each sync cycle ends, keeping
  // the paired flag current.
  useEffect(() => {
    if (syncing) return
    let active = true
    invoke<NeonStatus | null>('neon_status')
      .then((s) => {
        if (active) setBackup(s)
      })
      .catch(() => {}) // treat as not paired — refresh stays hidden
    return () => {
      active = false
    }
  }, [syncing])

  const paired = backup?.enabled === true
  const atRoot = selection.type === 'all'
  const scope = scopeInfo(selection, folders, tags)
  const inBin = selection.type === 'bin'

  const count = resultCount !== null && (
    <span
      className="mobile-title-count mono tabnum"
      aria-label={`${resultCount} results`}
    >
      {resultCount.toLocaleString()}
    </span>
  )

  return (
    <header className="mobile-chrome">
      <div className="flex items-center gap-1 pl-3 pr-2" style={{ height: 56 }}>
        <h1 className="mobile-title">
          {atRoot ? (
            <button
              type="button"
              className="mobile-title-btn"
              onClick={onOpenFilter}
              aria-label="Ferrico — all bookmarks. Change filter"
            >
              <span className="mobile-title-label">Ferrico</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="mobile-title-btn is-root"
                onClick={() => onSelect({ type: 'all' })}
                aria-label="Ferrico — back to all bookmarks"
              >
                Ferrico
              </button>
              <span className="mobile-title-sep" aria-hidden="true">
                <IconChevronRight size={14} />
              </span>
              <button
                type="button"
                className="mobile-title-btn is-scope"
                onClick={onOpenFilter}
                aria-label={`${scope.label}. Change filter`}
              >
                {scope.icon && <span className="mobile-title-icon">{scope.icon}</span>}
                <span className="mobile-title-label">{scope.label}</span>
              </button>
            </>
          )}
          {count}
        </h1>
        {syncing && (
          <span
            role="status"
            className="flex items-center gap-1.5 text-xs flex-none"
            style={{ color: 'var(--text-3)' }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full border-2 animate-spin flex-none"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              aria-hidden="true"
            />
            <span className="sr-only">Syncing…</span>
          </span>
        )}
        {paired && (
          <button
            className="mobile-icon-btn"
            onClick={() => {
              // Failures surface through the `backup-error` event, which the
              // shell already renders — nothing to do with the rejection here.
              invoke('neon_sync_now').catch(() => {})
            }}
            disabled={syncing}
            aria-label="Refresh bookmarks"
          >
            <IconRefresh size={18} />
          </button>
        )}
        <button
          className="mobile-icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
        <button
          className="mobile-icon-btn"
          onClick={onToggleView}
          aria-label={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
        >
          {viewMode === 'list' ? <IconLayoutGrid size={16} /> : <IconLayoutList size={16} />}
        </button>
        <button className="mobile-icon-btn" onClick={onOpenSettings} aria-label="Settings">
          <IconSettings size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 pb-2">
        <SearchBox ref={searchRef} mobile onSearch={onSearch} />
        {onOpenFilter && (
          <button
            className={`mobile-icon-btn${atRoot ? '' : ' is-active'}`}
            onClick={onOpenFilter}
            aria-label="Filter by folder or tag"
            aria-pressed={!atRoot}
          >
            <IconFilter size={18} />
          </button>
        )}
      </div>

      {!inBin && (
        <MobileScopeChips
          selection={selection}
          folders={folders}
          tags={tags}
          counts={counts}
          onSelect={onSelect}
        />
      )}
    </header>
  )
}
