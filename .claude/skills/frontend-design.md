---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Also use when the user mentions animations, responsive design, accessibility, typography, or code quality for any UI. Generates creative, polished, accessible, and well-structured code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with meticulous attention to aesthetic detail, accessibility, motion, responsiveness, and component architecture.

---

## Phase 1: Design Thinking (Always Do This First)

Before writing a single line of code, commit to a clear conceptual direction:

- **Purpose**: What problem does this solve? Who uses it, and in what context?
- **Tone**: Choose one extreme and execute it with precision. Examples: brutally minimal, maximalist editorial, retro-futuristic, organic/natural, luxury/refined, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian. Never blend two extremes — pick one and own it.
- **Memorability**: Identify the single element that makes this unforgettable. That element drives every other decision.
- **Constraints**: Framework, performance budget, accessibility requirements, target devices.

**CRITICAL**: Every design decision must serve the conceptual direction. Generic choices indicate lack of commitment. Bold minimalism and maximalist complexity both succeed — the key is intentionality.

---

## Phase 2: Component Architecture

### Structure Rules (enforced)

- **Single Responsibility**: Every component does one thing. A card is a card. A button is a button. A layout shell is a layout shell. Never mix concerns.
- **Composition over Configuration**: Build small, composable primitives. Assemble them into larger patterns. Never build a monolithic mega-component.
- **Prop Contracts**: Define clear, minimal prop interfaces. Default props must be defined for every optional prop. No component should have required props that lack obvious defaults in a demo context.
- **State Locality**: Keep state as close to where it is used as possible. Lift state only when two or more siblings genuinely need it.
- **No Inline Logic in JSX**: Extract conditionals, mappings, and transformations to named variables or functions above the return statement. JSX should read like a layout description, not a program.

### File Structure (for multi-component work)

```
/components
  /ui          — primitives (Button, Input, Badge, Icon)
  /layout      — shells (PageWrapper, Grid, Section, Stack)
  /patterns    — assembled patterns (Card, Modal, Nav, Hero)
/hooks         — stateful logic extracted from components
/styles        — tokens, resets, global CSS
```

For single-file artifacts, inline this structure logically using comment sections.

---

## Phase 3: Typography

Typography is the most powerful design tool available. Treat it as the primary visual element, not an afterthought.

### Font Selection Rules (enforced)

- **Never use**: Inter, Roboto, Arial, Helvetica, system-ui, or any other neutral sans-serif as the primary display font. These are invisible — they carry no voice.
- **Always pair two fonts**: a distinctive display/heading font and a refined, highly legible body font. The pair should create intentional contrast — weight, width, personality.
- **Source fonts from**: Google Fonts, Adobe Fonts, or Bunny Fonts (privacy-respecting CDN). Import at the top of the file. Never rely on system font stacks for anything other than monospace code blocks.
- **Establish a type scale**: Use a modular scale (1.25 or 1.333 ratio). Define sizes as CSS custom properties: `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-display`.
- **Line height and letter spacing are non-negotiable**: Display text needs tight tracking (`letter-spacing: -0.02em` to `-0.04em`). Body text needs generous leading (`line-height: 1.6` to `1.75`). Small caps, tabular figures, and optical sizing should be applied where supported.

### Typographic Hierarchy

Every design must have exactly three levels of hierarchy operating simultaneously: display (commands attention), supporting (guides reading), and utility (labels, captions, metadata). Each level must be visually distinct. If a user cannot identify which level is which at a glance, the hierarchy has failed.

---

## Phase 4: Color and Theme

- Use CSS custom properties for the entire palette. No hardcoded color values anywhere in component code.
- Structure tokens: `--color-bg`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-accent`, `--color-accent-muted`.
- **One dominant neutral family + one sharp accent**. Two accents maximum. More than two creates visual noise.
- Commit to light or dark. Do not hedge with a "soft" middle — it reads as unfinished. If the design calls for a theme toggle, implement it cleanly with a `data-theme` attribute on the root element.
- Contrast ratios must meet WCAG AA at minimum (4.5:1 for body text, 3:1 for large text and UI components). Verify this before finalizing.

---

## Phase 5: Motion and Animation

Motion must feel intentional, physics-aware, and purposeful. It communicates state and guides attention — it never decorates for its own sake.

### Motion Principles (enforced)

- **Ease curves**: Never use `linear` for UI transitions. Default to `cubic-bezier(0.4, 0, 0.2, 1)` (material standard ease). For entrances, bias toward ease-out. For exits, bias toward ease-in.
- **Duration**: Micro-interactions (hover, focus): 100ms–200ms. State transitions (expand, collapse, modal open): 250ms–400ms. Page-level orchestration: 400ms–700ms with staggered delays. Nothing should feel sluggish.
- **Page load orchestration**: One well-choreographed entrance sequence outperforms scattered micro-interactions. Stagger elements with `animation-delay` increments of 60ms–100ms. Fade + translate is the canonical entrance pattern (`opacity: 0` to `1`, `transform: translateY(12px)` to `translateY(0)`).
- **Scroll-triggered animation**: Use `IntersectionObserver` for scroll reveals. Add a `data-reveal` attribute pattern for reusable scroll animations.
- **Reduced motion**: Always include `@media (prefers-reduced-motion: reduce)` overrides. Strip all transforms and duration-based animations. This is non-negotiable.

### CSS Animation Pattern

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeUp 0.45s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-in { animation: none; }
}
```

---

## Phase 6: Responsive and Mobile Layout

Every interface must be designed mobile-first and scale upward. A design that only works at 1440px is not production-grade.

### Layout Rules (enforced)

- **Mobile-first CSS**: Write base styles for mobile. Add complexity at breakpoints using `min-width` queries, never `max-width`.
- **Breakpoint tokens**: Define as CSS custom properties or JS constants. Standard set: `sm: 480px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`. Use only these — never arbitrary magic numbers.
- **Grid systems**: Use CSS Grid for two-dimensional layout. Use Flexbox for one-dimensional alignment within components. Never use both for the same layout problem.
- **Fluid sizing**: Use `clamp()` for responsive typography and spacing. Example: `font-size: clamp(1rem, 2.5vw, 1.5rem)`. This eliminates breakpoint-specific font overrides.
- **Touch targets**: All interactive elements must be at minimum 44x44px on mobile. Apply `min-height: 44px; min-width: 44px` to buttons, links, and controls.
- **No fixed pixel widths on containers**: Use `max-width` with `width: 100%` and horizontal padding. Containers must never cause horizontal scroll.

---

## Phase 7: Accessibility (a11y)

Accessibility is a code quality requirement, not an optional enhancement. All output must meet WCAG 2.1 AA.

### Required Patterns (enforced, always)

- **Semantic HTML**: Use the correct element for the job. `<button>` for actions, `<a>` for navigation, `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>` where appropriate. Never use `<div>` or `<span>` as interactive elements.
- **ARIA roles and labels**: When semantic HTML is insufficient (custom dropdowns, modals, tabs), add the correct ARIA role, `aria-label` or `aria-labelledby`, and state attributes (`aria-expanded`, `aria-selected`, `aria-current`).
- **Keyboard navigation**: All interactive elements must be reachable and operable via keyboard. Implement logical tab order. Custom components must handle `Enter`, `Space`, and `Escape` keys where appropriate.
- **Focus indicators**: Never remove focus outlines with `outline: none` without replacing them with a clearly visible alternative. Use `:focus-visible` to scope enhanced focus styles to keyboard users only.
- **Alt text**: All `<img>` elements require `alt` attributes. Decorative images use `alt=""`. Informational images describe their content concisely.
- **Color alone**: Never use color as the sole indicator of meaning. Icons, labels, patterns, or shapes must accompany any color-coded state.
- **Form labels**: Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>`. Placeholder text is not a label substitute.

### React Accessibility

In React components, forward refs when wrapping native interactive elements. Use `useId()` (React 18+) to generate stable IDs for label/input associations. Manage focus programmatically when modals or dialogs open using `useRef` and `.focus()`.

---

## Phase 8: Code Quality

### Rules (enforced)

- **CSS custom properties for all tokens**: Colors, spacing, radius, shadow, typography scale, and timing must all be defined as variables. No magic numbers in component code.
- **Consistent spacing scale**: Use a base-4 or base-8 spacing system. Define as variables: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`, `--space-12: 48px`, `--space-16: 64px`.
- **No dead code**: Do not include commented-out code, unused imports, or placeholder TODO blocks in deliverables.
- **Descriptive naming**: Component names are PascalCase nouns. Event handlers are `handle` + action (`handleSubmit`, `handleToggle`). Boolean props and state are `is` or `has` prefixed (`isOpen`, `hasError`).
- **Avoid `!important`**: If cascade specificity requires `!important`, the CSS architecture is wrong. Fix the architecture.
- **Performance**: Do not import entire libraries to use a single utility. Never animate `width`, `height`, `top`, or `left` — always animate `transform` and `opacity` instead. These are GPU-composited and do not cause reflow.

---

## Visual Details and Atmosphere

Beyond layout and code, surface quality is what makes a design memorable:

- **Backgrounds**: Avoid flat solid colors for large surfaces. Use subtle gradients, noise textures, layered transparency, or geometric patterns to create depth.
- **Shadows**: Use layered shadows for depth (two or three layers at different offsets and blurs). Never use a single hard shadow.
- **Border radius**: Commit to one radius value and use it consistently. Very small (2px–4px) reads as precise and technical. Large (16px–24px) reads as friendly. Mixed radii are rarely intentional.
- **Micro-details**: Custom scrollbar styling, subtle hover color shifts, icon stroke-width consistency, and cursor changes on interactive elements are the difference between good and exceptional.

---

## Output Checklist

Before finalizing any output, verify:

- [ ] Conceptual direction is clear and executed consistently
- [ ] Two distinct fonts with a defined type scale
- [ ] Full color token system using CSS custom properties
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Mobile-first responsive layout with defined breakpoints
- [ ] All interactive elements are keyboard-accessible
- [ ] ARIA roles and labels applied where semantic HTML is insufficient
- [ ] Color contrast meets WCAG AA
- [ ] No hardcoded values in component code
- [ ] No unused code, imports, or dead logic
