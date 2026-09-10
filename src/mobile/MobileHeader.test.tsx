import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MobileHeader } from './MobileHeader'
import { makeFolder, makeTag } from '../test-utils'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { invoke } from '@tauri-apps/api/core'

const PAIRED = { enabled: true, last_sync: Math.floor(new Date('2026-07-18T10:00:00Z').getTime() / 1000) }

function mockNeonStatus(status: unknown) {
  vi.mocked(invoke).mockImplementation((cmd: string) => {
    if (cmd === 'neon_status') return Promise.resolve(status)
    return Promise.resolve(null)
  })
}

function makeProps(overrides: Partial<Parameters<typeof MobileHeader>[0]> = {}) {
  return {
    onSearch: vi.fn(),
    viewMode: 'list' as const,
    onToggleView: vi.fn(),
    theme: 'dark' as const,
    onToggleTheme: vi.fn(),
    onOpenSettings: vi.fn(),
    syncing: false,
    selection: { type: 'all' as const },
    folders: [makeFolder({ id: 'folder-1', name: 'Reading' })],
    tags: [makeTag({ id: 'tag-1', name: 'rust', color: '#f00' })],
    counts: { total: 5, inbox: 2, bin: 0, broken: 0 },
    onSelect: vi.fn(),
    resultCount: 5,
    ...overrides,
  }
}

describe('MobileHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNeonStatus(null)
  })

  it('forwards the debounced search query and hides the ⌘F hint', async () => {
    const props = makeProps()
    render(<MobileHeader {...props} />)
    expect(screen.queryByText('⌘F')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search bookmarks'), { target: { value: 'rust' } })
    await waitFor(() => expect(props.onSearch).toHaveBeenCalledWith('rust'))
  })

  it('toggles the view mode and opens settings', () => {
    const props = makeProps()
    render(<MobileHeader {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to grid view' }))
    expect(props.onToggleView).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(props.onOpenSettings).toHaveBeenCalled()
  })

  it('renders the filter button only when a handler is provided', () => {
    const { unmount } = render(<MobileHeader {...makeProps()} />)
    expect(screen.queryByRole('button', { name: 'Filter by folder or tag' })).not.toBeInTheDocument()
    unmount()

    const onOpenFilter = vi.fn()
    render(<MobileHeader {...makeProps({ onOpenFilter })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Filter by folder or tag' }))
    expect(onOpenFilter).toHaveBeenCalled()
  })

  it('hides refresh while not paired and never renders a last-sync line', async () => {
    mockNeonStatus({ enabled: false, last_sync: null })
    render(<MobileHeader {...makeProps()} />)
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('neon_status'))
    expect(screen.queryByRole('button', { name: 'Refresh bookmarks' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Last sync/)).not.toBeInTheDocument()
  })

  it('shows refresh when paired; last-sync lives on the Settings screen', async () => {
    mockNeonStatus(PAIRED)
    render(<MobileHeader {...makeProps()} />)
    expect(await screen.findByRole('button', { name: 'Refresh bookmarks' })).toBeEnabled()
    expect(screen.queryByText(/Last sync/)).not.toBeInTheDocument()
  })

  describe('scope title', () => {
    it('at "All" shows the brand as the title with the result count and opens the drawer on tap', () => {
      const onOpenFilter = vi.fn()
      render(<MobileHeader {...makeProps({ onOpenFilter, resultCount: 1234 })} />)
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveTextContent('Ferrico')
      expect(title).not.toHaveTextContent('All bookmarks')
      expect(screen.getByLabelText('1234 results')).toHaveTextContent((1234).toLocaleString())
      fireEvent.click(screen.getByRole('button', { name: /Ferrico — all bookmarks/ }))
      expect(onOpenFilter).toHaveBeenCalled()
    })

    it('shows "Ferrico › <tag>" for a tag scope; brand goes back to All, scope opens the drawer', () => {
      const onOpenFilter = vi.fn()
      const onSelect = vi.fn()
      render(
        <MobileHeader
          {...makeProps({ onOpenFilter, onSelect, selection: { type: 'tag', id: 'tag-1' } })}
        />,
      )
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveTextContent('Ferrico')
      expect(title).toHaveTextContent('rust')
      fireEvent.click(screen.getByRole('button', { name: /rust\. Change filter/ }))
      expect(onOpenFilter).toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: /back to all bookmarks/ }))
      expect(onSelect).toHaveBeenCalledWith({ type: 'all' })
    })

    it('shows the folder name for a folder scope and marks the filter button active', () => {
      render(
        <MobileHeader
          {...makeProps({ onOpenFilter: vi.fn(), selection: { type: 'folder', id: 'folder-1' } })}
        />,
      )
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reading')
      expect(screen.getByRole('button', { name: 'Filter by folder or tag' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('leaves the filter button unpressed at "All"', () => {
      render(<MobileHeader {...makeProps({ onOpenFilter: vi.fn() })} />)
      expect(screen.getByRole('button', { name: 'Filter by folder or tag' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('hides the result count while the first load is pending', () => {
      render(<MobileHeader {...makeProps({ resultCount: null })} />)
      expect(screen.queryByLabelText(/results$/)).not.toBeInTheDocument()
    })
  })

  describe('quick-filter chips', () => {
    it('renders the chip row outside the bin and hides it inside', () => {
      const { unmount } = render(<MobileHeader {...makeProps()} />)
      expect(screen.getByRole('group', { name: 'Quick filters' })).toBeInTheDocument()
      unmount()
      render(<MobileHeader {...makeProps({ selection: { type: 'bin' } })} />)
      expect(screen.queryByRole('group', { name: 'Quick filters' })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bin')
    })
  })

  it('invokes neon_sync_now on refresh tap', async () => {
    mockNeonStatus(PAIRED)
    render(<MobileHeader {...makeProps()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh bookmarks' }))
    expect(invoke).toHaveBeenCalledWith('neon_sync_now')
  })

  it('disables refresh and shows the spinner while syncing', async () => {
    mockNeonStatus(PAIRED)
    const { rerender } = render(<MobileHeader {...makeProps()} />)
    await screen.findByRole('button', { name: 'Refresh bookmarks' })

    rerender(<MobileHeader {...makeProps({ syncing: true })} />)
    expect(screen.getByRole('button', { name: 'Refresh bookmarks' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Syncing…')
  })

  it('refetches neon_status after a sync cycle ends', async () => {
    mockNeonStatus(PAIRED)
    const { rerender } = render(<MobileHeader {...makeProps()} />)
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('neon_status'))
    const callsBefore = vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'neon_status').length

    rerender(<MobileHeader {...makeProps({ syncing: true })} />)
    rerender(<MobileHeader {...makeProps({ syncing: false })} />)
    await waitFor(() => {
      const calls = vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'neon_status').length
      expect(calls).toBe(callsBefore + 1)
    })
  })
})
