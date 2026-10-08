import { isMacPlatform } from './platform'

// Single source of truth for desktop keyboard shortcuts. Key handlers, inline
// hints (<Kbd>), aria-keyshortcuts and the Shortcut sheet all read from here,
// so a hint can never drift from the binding it describes.
//
// `keys` is written `Mod+…`: Mod is ⌘ on macOS and Ctrl on Linux/Windows, and
// is matched strictly per OS (Ctrl+N does nothing on a Mac). The final key is
// compared against `KeyboardEvent.key` — the typed character, not the physical
// key — so `?` works on every layout (it's Shift+ß on German QWERTZ).
//
// Every entry gets its own label; don't reuse generic action strings, they
// drift once the action's wording changes.

export type ShortcutGroup = 'Global' | 'In dialogs'

export interface Shortcut {
  keys: string
  label: string
  group: ShortcutGroup
}

export const SHORTCUTS = {
  newBookmark: { keys: 'Mod+N', label: 'New bookmark', group: 'Global' },
  focusSearch: { keys: 'Mod+F', label: 'Search bookmarks', group: 'Global' },
  openSettings: { keys: 'Mod+,', label: 'Open settings', group: 'Global' },
  showShortcuts: { keys: '?', label: 'Show keyboard shortcuts', group: 'Global' },
  submitDialog: { keys: 'Mod+Enter', label: 'Save from any field', group: 'In dialogs' },
  closeDialog: { keys: 'Escape', label: 'Close dialog', group: 'In dialogs' },
} as const satisfies Record<string, Shortcut>

export type ShortcutId = keyof typeof SHORTCUTS

export const SHORTCUT_GROUPS: ShortcutGroup[] = ['Global', 'In dialogs']

interface ParsedKeys {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

function parse(keys: string): ParsedKeys {
  const parts = keys.split('+')
  const key = parts.pop()!
  return {
    mod: parts.includes('Mod'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    key,
  }
}

// A single non-letter character (`?`, `,`) is already the product of whatever
// Shift state the layout needs, so Shift is not checked for those.
function shiftIsImplied(key: string): boolean {
  return key.length === 1 && key.toLowerCase() === key.toUpperCase()
}

export function matchesShortcut(
  e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  id: ShortcutId,
  mac = isMacPlatform(),
): boolean {
  const want = parse(SHORTCUTS[id].keys)
  const modDown = mac ? e.metaKey : e.ctrlKey
  const otherModDown = mac ? e.ctrlKey : e.metaKey
  if (modDown !== want.mod || otherModDown || e.altKey !== want.alt) return false
  if (!shiftIsImplied(want.key) && e.shiftKey !== want.shift) return false
  return e.key.toLowerCase() === want.key.toLowerCase()
}

const MAC_GLYPHS: Record<string, string> = { Mod: '⌘', Shift: '⇧', Alt: '⌥', Enter: '↵', Escape: 'Esc' }
const PC_NAMES: Record<string, string> = { Mod: 'Ctrl', Escape: 'Esc' }

/** Display form: `⌘N` / `⌘↵` on macOS, `Ctrl+N` / `Ctrl+Enter` elsewhere. */
export function formatShortcut(id: ShortcutId, mac = isMacPlatform()): string {
  const parts = SHORTCUTS[id].keys.split('+').map((p) =>
    mac ? (MAC_GLYPHS[p] ?? p.toUpperCase()) : (PC_NAMES[p] ?? (p.length === 1 ? p.toUpperCase() : p)),
  )
  return parts.join(mac ? '' : '+')
}

/** Value for the `aria-keyshortcuts` attribute, e.g. `Control+N` / `Meta+N`. */
export function ariaKeyShortcuts(id: ShortcutId, mac = isMacPlatform()): string {
  return SHORTCUTS[id].keys
    .split('+')
    .map((p) => (p === 'Mod' ? (mac ? 'Meta' : 'Control') : p.length === 1 ? p.toUpperCase() : p))
    .join('+')
}

/** True when keystrokes are going into a text field, so bare-key shortcuts like `?` must stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'color', 'range', 'file'].includes(target.type)
  }
  return false
}
