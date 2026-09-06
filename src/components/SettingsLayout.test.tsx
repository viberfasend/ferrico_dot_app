import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SettingsLayout } from './SettingsLayout'

describe('SettingsLayout', () => {
  it('applies safe-area-inset-top padding to the header', () => {
    render(
      <SettingsLayout breadcrumb={[{ label: 'Settings' }]} onBack={() => {}}>
        <p>content</p>
      </SettingsLayout>,
    )
    const header = document.querySelector('header')
    expect(header).not.toBeNull()
    // The `safe-top` class provides `padding-top: env(safe-area-inset-top)`,
    // keeping the header clear of the status bar on mobile. On desktop
    // env() resolves to 0 — harmless.
    expect(header!.className).toContain('safe-top')
  })

  it('applies safe-area-inset-bottom padding to the scrollable content area', () => {
    render(
      <SettingsLayout breadcrumb={[{ label: 'Settings' }]} onBack={() => {}}>
        <p>content</p>
      </SettingsLayout>,
    )
    // The scrollable content area is the div right after the header.
    const header = document.querySelector('header')!
    const contentArea = header.nextElementSibling as HTMLElement
    expect(contentArea).not.toBeNull()
    // The `safe-bottom` class provides `padding-bottom: env(safe-area-inset-bottom)`,
    // keeping the last item reachable above the gesture bar / keyboard.
    expect(contentArea.className).toContain('safe-bottom')
  })
})
