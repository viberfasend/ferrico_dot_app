import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MobileScopeChips } from './MobileScopeChips'
import { makeFolder, makeTag } from '../test-utils'

const TAGS = [
  makeTag({ id: 'tag-a', name: 'alpha', color: '#111', bookmark_count: 3 }),
  makeTag({ id: 'tag-b', name: 'beta', color: '#222', bookmark_count: 1 }),
  makeTag({ id: 'tag-c', name: 'gamma', color: '#333', bookmark_count: 7 }),
]
const FOLDERS = [makeFolder({ id: 'folder-1', name: 'Reading' })]
const COUNTS = { total: 11, inbox: 4, bin: 0, broken: 0 }

function renderChips(selection: Parameters<typeof MobileScopeChips>[0]['selection'], onSelect = vi.fn()) {
  render(
    <MobileScopeChips selection={selection} folders={FOLDERS} tags={TAGS} counts={COUNTS} onSelect={onSelect} />,
  )
  return onSelect
}

function chipLabels(): string[] {
  return screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? '')
}

describe('MobileScopeChips', () => {
  it('renders All · Inbox · tags in backend order, with "All" pressed by default', () => {
    renderChips({ type: 'all' })
    expect(chipLabels()).toEqual(['All', 'Inbox', 'alpha', 'beta', 'gamma'])
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Inbox' })).toHaveTextContent('4')
  })

  it('selects a tag on tap', () => {
    const onSelect = renderChips({ type: 'all' })
    fireEvent.click(screen.getByRole('button', { name: 'gamma' }))
    expect(onSelect).toHaveBeenCalledWith({ type: 'tag', id: 'tag-c' })
  })

  it('moves the active tag to the front of the tag group and clears it on tap', () => {
    const onSelect = renderChips({ type: 'tag', id: 'tag-c' })
    expect(chipLabels()).toEqual(['All', 'Inbox', 'Clear filter gamma', 'alpha', 'beta'])
    const active = screen.getByRole('button', { name: 'Clear filter gamma' })
    expect(active).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(active)
    expect(onSelect).toHaveBeenCalledWith({ type: 'all' })
  })

  it('offers a clear action on the active Inbox chip', () => {
    const onSelect = renderChips({ type: 'inbox' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter Inbox' }))
    expect(onSelect).toHaveBeenCalledWith({ type: 'all' })
  })

  it('shows a transient folder chip at the front while a folder is active', () => {
    const onSelect = renderChips({ type: 'folder', id: 'folder-1' })
    expect(chipLabels()[0]).toBe('Clear filter Reading')
    fireEvent.click(screen.getByRole('button', { name: 'Clear filter Reading' }))
    expect(onSelect).toHaveBeenCalledWith({ type: 'all' })
  })

  it('never advertises a clear action on the "All" chip', () => {
    renderChips({ type: 'all' })
    expect(screen.queryByRole('button', { name: /Clear filter All/ })).not.toBeInTheDocument()
  })
})
