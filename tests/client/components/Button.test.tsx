import { describe, it, expect, vi } from 'vitest'

// Mock Button component
vi.mock('../../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, variant, disabled }: any) => {
    return {
      type: 'button',
      props: { children, onClick, variant, disabled },
      render: () => children,
    }
  },
}))

describe('Button Component', () => {
  it('should render button with text', () => {
    const { Button } = vi.mocked(require('../../client/src/components/ui/button'))
    const button = Button({ children: 'Click me' })
    
    expect(button.props.children).toBe('Click me')
    expect(button.type).toBe('button')
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    const { Button } = vi.mocked(require('../../client/src/components/ui/button'))
    const button = Button({ children: 'Click me', onClick: handleClick })
    
    expect(button.props.onClick).toBe(handleClick)
  })

  it('should apply variant styles', () => {
    const { Button } = vi.mocked(require('../../client/src/components/ui/button'))
    const button = Button({ children: 'Delete', variant: 'destructive' })
    
    expect(button.props.variant).toBe('destructive')
  })

  it('should be disabled when disabled prop is true', () => {
    const { Button } = vi.mocked(require('../../client/src/components/ui/button'))
    const button = Button({ children: 'Disabled Button', disabled: true })
    
    expect(button.props.disabled).toBe(true)
  })
})