import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'
import { makeBookmark } from './test-utils'
import type { Bookmark, SidebarData } from './types'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('./events', () => ({
  subscribeToBookmarkAdded: vi.fn().mockResolvedValue(() => {}),
  subscribeToHealthCheckProgress: vi.fn().mockResolvedValue(() => {}),
  subscribeToCoverUpdated: vi.fn().mockResolvedValue(() => {}),
  subscribeToBackupSync: vi.fn().mockResolvedValue(() => {}),
}))

// happy-dom returns 0 for clientHeight, which would make the virtualizer render
// zero items — mock it to render every row (see BookmarkList.test.tsx). With
// every row "visible", the list is immediately near its end, which is what
// drives the load-more path in these tests.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: (i: number) => number }) => ({
    getTotalSize: () => Array.from({ length: count }, (_, i) => estimateSize(i)).reduce((a, b) => a + b, 0),
    getVirtualItems: () => Array.from({ length: count }, (_, i) => ({
      key: i,
      index: i,
      start: Array.from({ length: i }, (_, j) => estimateSize(j)).reduce((a, b) => a + b, 0),
      size: estimateSize(i),
    })),
    measureElement: () => {},
  }),
}))

import { invoke } from '@tauri-apps/api/core'

// Mirrors BOOKMARKS_PAGE_SIZE in App.tsx.
const PAGE = 200

function makeSidebar(total: number): SidebarData {
  return { folders: [], tags: [], counts: { total, inbox: 0, bin: 0, broken: 0 } }
}

function page(items: Bookmark[], total: number) {
  return { items, total }
}

describe('App bookmark pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('fetches page 1 with limit/offset, then appends the next page when the list nears its end', async () => {
    const first = Array.from({ length: PAGE }, (_, i) =>
      makeBookmark({ id: `p1-${i}`, title: `First ${i}`, url: `https://a.example.com/${i}` }),
    )
    const second = Array.from({ length: 50 }, (_, i) =>
      makeBookmark({ id: `p2-${i}`, title: `Second ${i}`, url: `https://b.example.com/${i}` }),
    )
    vi.mocked(invoke).mockImplementation((cmd: string, args?: any) => {
      if (cmd === 'get_bookmarks') {
        const offset: number = args?.offset ?? 0
        return Promise.resolve(offset === 0 ? page(first, 250) : page(second, 250))
      }
      if (cmd === 'get_sidebar') return Promise.resolve(makeSidebar(250))
      return Promise.resolve(null)
    })

    render(<App />)
    await screen.findByText('First 0')
    expect(invoke).toHaveBeenCalledWith('get_bookmarks', {
      folderId: null,
      tagId: null,
      search: null,
      inboxOnly: false,
      limit: PAGE,
      offset: 0,
    })
    // Every row is "visible" in the test virtualizer, so the list is within the
    // load-more threshold of the end → App requests page 2 at offset = loaded.
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_bookmarks', expect.objectContaining({ limit: PAGE, offset: PAGE }))
    })
    // Page 2 rows are appended to the loaded list.
    expect(await screen.findByText('Second 49')).toBeInTheDocument()
  })

  it('does not request further pages once everything is loaded', async () => {
    const all = Array.from({ length: 5 }, (_, i) =>
      makeBookmark({ id: `bm-${i}`, title: `Only ${i}`, url: `https://c.example.com/${i}` }),
    )
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_bookmarks') return Promise.resolve(page(all, all.length))
      if (cmd === 'get_sidebar') return Promise.resolve(makeSidebar(all.length))
      return Promise.resolve(null)
    })

    render(<App />)
    await screen.findByText('Only 0')
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_bookmarks', expect.objectContaining({ limit: PAGE, offset: 0 }))
    })
    // total == loaded → hasMore is false → exactly one get_bookmarks call.
    const calls = vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'get_bookmarks')
    expect(calls).toHaveLength(1)
  })
})
