# NexSpace Design System

## Color Tokens

### Semantic Colors
Our design system uses semantic color tokens that automatically adapt to light and dark themes:

- **Primary**: Blue - Used for primary actions, links, and focus states
- **Secondary**: Gray - Used for secondary actions and less prominent UI elements
- **Success**: Green - Used for success states, confirmations, and positive actions
- **Warning**: Amber - Used for warning states and cautionary messages
- **Danger/Destructive**: Red - Used for errors, deletions, and critical actions
- **Muted**: Light gray - Used for disabled states and subtle backgrounds

### Usage in Components
```tsx
// Button variants
<Button variant="primary">Save Changes</Button>
<Button variant="success">Complete</Button>
<Button variant="warning">Review Required</Button>
<Button variant="danger">Delete</Button>

// Badge variants
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Expired</Badge>
```

## Typography Scale

### Font Sizes
- `text-xs`: 0.75rem - Smallest text, used for labels and hints
- `text-sm`: 0.875rem - Small text, used for secondary content
- `text-base`: 1rem - Default body text
- `text-lg`: 1.125rem - Slightly larger text for emphasis
- `text-xl`: 1.25rem - Subheadings
- `text-2xl`: 1.5rem - Section headers
- `text-3xl`: 1.875rem - Page titles

### Font Weights
- `font-normal`: 400 - Body text
- `font-medium`: 500 - Subtle emphasis
- `font-semibold`: 600 - Headers and labels
- `font-bold`: 700 - Strong emphasis

## Spacing Scale
Our spacing scale follows a consistent pattern:
- `space-0.5`: 0.125rem (2px)
- `space-1`: 0.25rem (4px)
- `space-2`: 0.5rem (8px)
- `space-3`: 0.75rem (12px)
- `space-4`: 1rem (16px)
- `space-5`: 1.25rem (20px)
- `space-6`: 1.5rem (24px)
- `space-8`: 2rem (32px)
- `space-10`: 2.5rem (40px)
- `space-12`: 3rem (48px)

## Shadow Presets
- `shadow-xs`: Minimal shadow for subtle elevation
- `shadow-sm`: Small shadow for cards and dropdowns
- `shadow-md`: Medium shadow for modals and popovers
- `shadow-lg`: Large shadow for tooltips
- `shadow-xl`: Extra large shadow for floating elements
- `shadow-2xl`: Maximum shadow for high elevation

## Component Guidelines

### Focus States
All interactive elements should have visible focus states for accessibility:
```css
focus:ring-2 focus:ring-primary focus:ring-offset-2
```

### Loading States
Use the Skeleton component for loading states:
```tsx
<Skeleton className="h-10 w-full" />
```

### Disabled States
Apply consistent disabled styling:
```css
disabled:opacity-50 disabled:cursor-not-allowed
```

### Dark Mode
All components automatically support dark mode through CSS variables. Use semantic colors rather than fixed values:
```tsx
// ✅ Good
<div className="bg-background text-foreground">

// ❌ Avoid
<div className="bg-white text-gray-900">
```

## Responsive Design
Our design system is mobile-first. Use responsive modifiers:
```tsx
<div className="p-4 sm:p-6 lg:p-8">
  <h1 className="text-xl sm:text-2xl lg:text-3xl">
```

## Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML elements
- Include ARIA labels where needed
- Maintain minimum contrast ratios (WCAG AA)
- Test with screen readers

## Common Patterns

### Card Layout
```tsx
<Card className="p-6">
  <h3 className="text-lg font-semibold mb-2">Title</h3>
  <p className="text-muted-foreground">Description</p>
</Card>
```

### Form Fields
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter email" />
</div>
```

### Button Group
```tsx
<div className="flex gap-2">
  <Button variant="outline">Cancel</Button>
  <Button>Confirm</Button>
</div>
```