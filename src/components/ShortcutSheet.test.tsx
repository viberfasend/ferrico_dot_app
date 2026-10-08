import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ShortcutSheet } from './ShortcutSheet'
import { SHORTCUTS } from '../shortcuts'

describe('ShortcutSheet', () => {
  it('lists every registered shortcut under its group', () => {
    render(<ShortcutSheet onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Global' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'In dialogs' })).toBeInTheDocument()
    for (const { label } of Object.values(SHORTCUTS)) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
