import { describe, it, expect } from 'vitest'
import { SHORTCUTS, matchesShortcut, formatShortcut, ariaKeyShortcuts, isTypingTarget } from './shortcuts'

function key(k: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {}) {
  return { key: k, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...mods }
}

describe('matchesShortcut', () => {
  it('maps Mod to Ctrl on Linux/Windows and ignores Meta there', () => {
    expect(matchesShortcut(key('n', { ctrlKey: true }), 'newBookmark', false)).toBe(true)
    expect(matchesShortcut(key('n', { metaKey: true }), 'newBookmark', false)).toBe(false)
  })

  it('maps Mod to ⌘ on macOS and ignores Ctrl there', () => {
    expect(matchesShortcut(key('n', { metaKey: true }), 'newBookmark', true)).toBe(true)
    expect(matchesShortcut(key('n', { ctrlKey: true }), 'newBookmark', true)).toBe(false)
  })

  it('rejects extra modifiers on letter shortcuts', () => {
    expect(matchesShortcut(key('N', { ctrlKey: true, shiftKey: true }), 'newBookmark', false)).toBe(false)
    expect(matchesShortcut(key('n', { ctrlKey: true, altKey: true }), 'newBookmark', false)).toBe(false)
  })

  it('requires the Mod key when declared', () => {
    expect(matchesShortcut(key('n'), 'newBookmark', false)).toBe(false)
    expect(matchesShortcut(key('Enter'), 'submitDialog', false)).toBe(false)
    expect(matchesShortcut(key('Enter', { ctrlKey: true }), 'submitDialog', false)).toBe(true)
  })

  it('matches ? by the typed character, whatever Shift the layout needs (Shift+ß on QWERTZ)', () => {
    expect(matchesShortcut(key('?', { shiftKey: true }), 'showShortcuts', false)).toBe(true)
    expect(matchesShortcut(key('ß', { shiftKey: true }), 'showShortcuts', false)).toBe(false)
    expect(matchesShortcut(key('?', { ctrlKey: true, shiftKey: true }), 'showShortcuts', false)).toBe(false)
  })

  it('matches Escape without modifiers', () => {
    expect(matchesShortcut(key('Escape'), 'closeDialog', false)).toBe(true)
  })
})

describe('formatShortcut', () => {
  it('uses glyphs on macOS', () => {
    expect(formatShortcut('newBookmark', true)).toBe('⌘N')
    expect(formatShortcut('submitDialog', true)).toBe('⌘↵')
    expect(formatShortcut('openSettings', true)).toBe('⌘,')
  })

  it('uses Ctrl+ text elsewhere', () => {
    expect(formatShortcut('newBookmark', false)).toBe('Ctrl+N')
    expect(formatShortcut('submitDialog', false)).toBe('Ctrl+Enter')
    expect(formatShortcut('closeDialog', false)).toBe('Esc')
    expect(formatShortcut('showShortcuts', false)).toBe('?')
  })
})

describe('ariaKeyShortcuts', () => {
  it('names the platform modifier', () => {
    expect(ariaKeyShortcuts('newBookmark', true)).toBe('Meta+N')
    expect(ariaKeyShortcuts('newBookmark', false)).toBe('Control+N')
    expect(ariaKeyShortcuts('submitDialog', false)).toBe('Control+Enter')
  })
})

describe('SHORTCUTS registry', () => {
  it('gives every entry its own label', () => {
    const labels = Object.values(SHORTCUTS).map((s) => s.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('isTypingTarget', () => {
  it('is true for text fields and false for buttons/checkboxes', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true)
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    expect(isTypingTarget(checkbox)).toBe(false)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
