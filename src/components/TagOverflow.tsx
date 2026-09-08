import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Tag } from '../types'

interface TagOverflowProps {
  tags: Tag[]
  onTagClick?: (tagId: string) => void
  maxTagWidth: number
  largeTargets?: boolean
}

interface MenuPosition {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

export function TagOverflow({ tags, onTagClick, maxTagWidth, largeTargets }: TagOverflowProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const targetSize = largeTargets ? 44 : 24
  const countLabel = `${tags.length} more tag${tags.length === 1 ? '' : 's'}`

  useLayoutEffect(() => {
    if (!open) return

    function updatePosition() {
      const button = buttonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      const gutter = 8
      const gap = 6
      const width = Math.min(220, window.innerWidth - gutter * 2)
      const left = Math.max(gutter, Math.min(rect.right - width, window.innerWidth - width - gutter))
      const above = rect.top - gutter - gap
      const below = window.innerHeight - rect.bottom - gutter - gap

      if (above > below && above >= 96) {
        setPosition({
          left,
          width,
          maxHeight: Math.min(180, above),
          bottom: window.innerHeight - rect.top + gap,
        })
      } else {
        setPosition({
          left,
          width,
          maxHeight: Math.min(180, Math.max(80, below)),
          top: rect.bottom + gap,
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function closeFromOutside(event: PointerEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    function closeFromKeyboard(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-no-drag
        className="tag-overflow-toggle mono"
        style={{ minWidth: targetSize, minHeight: targetSize }}
        aria-label={`Show ${countLabel}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
      >
        +{tags.length}
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          className="tag-overflow-menu"
          role="group"
          aria-label={countLabel}
          style={position}
          onClick={(event) => event.stopPropagation()}
        >
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="tag-pill cursor-pointer truncate transition-colors duration-100"
              style={{
                background: tag.color + '22',
                color: tag.color,
                maxWidth: maxTagWidth,
                border: 'none',
                minWidth: targetSize,
                minHeight: targetSize,
              }}
              onClick={(event) => {
                event.stopPropagation()
                setOpen(false)
                onTagClick?.(tag.id)
              }}
              onMouseEnter={(event) => (event.currentTarget.style.background = tag.color + '38')}
              onMouseLeave={(event) => (event.currentTarget.style.background = tag.color + '22')}
              aria-label={`Filter by tag ${tag.name}`}
              title={`Filter by tag: ${tag.name}`}
            >
              {tag.name}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
