import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// These tests guard against regressions of the Android keyboard bug where
// the Settings screen (with the pairing-code textarea) slid behind the
// status bar when the soft keyboard opened. Two native/config prerequisites
// must stay in place:
//
//  1. viewport-fit=cover  — without it, env(safe-area-inset-*) resolves to 0
//     on Android WebView, making every safe-area padding in mobile.css a no-op.
//  2. windowSoftInputMode=adjustResize — without it, the `fixed inset-0`
//     SettingsLayout container doesn't shrink when the keyboard appears,
//     so content is pushed behind the status bar and becomes non-reactive.

const repoRoot = resolve(__dirname, '..', '..')

describe('Android keyboard / safe-area config', () => {
  it('index.html viewport meta includes viewport-fit=cover', () => {
    const html = readFileSync(resolve(repoRoot, 'index.html'), 'utf-8')
    const metaMatch = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/)
    expect(metaMatch).not.toBeNull()
    expect(metaMatch![1]).toContain('viewport-fit=cover')
  })

  it('AndroidManifest activity declares windowSoftInputMode=adjustResize', () => {
    const manifest = readFileSync(
      resolve(repoRoot, 'src-tauri/gen/android/app/src/main/AndroidManifest.xml'),
      'utf-8',
    )
    expect(manifest).toContain('android:windowSoftInputMode="adjustResize"')
  })
})
