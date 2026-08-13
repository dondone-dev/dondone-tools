import { describe, expect, it } from 'vitest'
import { textareaVariants } from './textarea-variants'

describe('textareaVariants', () => {
  it('keeps a fixed default height with bounded vertical resizing', () => {
    const classes = textareaVariants()

    expect(classes).toContain('h-32')
    expect(classes).toContain('max-h-96')
    expect(classes).toContain('resize-y')
    expect(classes).toContain('overflow-y-auto')
    expect(classes).not.toContain('field-sizing-content')
  })

  it('exposes semantic compact and editor sizing variants', () => {
    expect(textareaVariants({ variant: 'compact' })).toContain('h-24')
    expect(textareaVariants({ variant: 'compact' })).toContain('max-h-64')
    expect(textareaVariants({ variant: 'editor' })).toContain('h-64')
    expect(textareaVariants({ variant: 'editor' })).toContain('max-h-[32rem]')
  })
})
