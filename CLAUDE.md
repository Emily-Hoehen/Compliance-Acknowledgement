# CLAUDE.md

This file tells Claude how to behave in this project. It is read automatically by Claude Code every time you open this repo. Update it to match your project as you build.

---

## Project Overview

**Project:** [Your Project Name]
**Owner:** [Your Name]
**Stack:** Next.js, React, TypeScript, Tailwind CSS
**Purpose:** [Describe what this project is and who it is for]

---

## Skills

Load the following skill files before producing any output for this project. Each skill contains the full guidelines for its domain. Skills are knowledge bases; each is loaded by its corresponding agent.

### Frontend Design Skill

**Path:** `.claude/skills/frontend-design.md`

Load this skill for any of the following tasks:

- Building or editing React components
- Styling pages, layouts, or UI elements
- Designing hero sections, cards, modals, forms, or navigation
- Implementing animations, transitions, or scroll effects
- Responsive layout work
- Accessibility improvements
- Any task where visual quality, typography, or component architecture is involved

This skill is the source of truth for design decisions, component structure, color tokens, typography rules, motion principles, and the output checklist.

### UX Writer Skill

**Path:** `.claude/skills/ux-writer.md`

Load this skill for any of the following tasks:

- Writing or reviewing button labels, CTAs, or navigation copy
- Writing error messages, validation copy, or system feedback
- Writing empty states, onboarding flows, or tooltips
- Writing form labels, placeholder text, or helper text
- Auditing existing UI copy for clarity, consistency, and tone
- Defining or applying a voice and tone guide
- Building a writing patterns library

This skill is the source of truth for all interface copy decisions, microcopy systems, and content design standards.

### QA Skill

**Path:** `.claude/skills/qa.md`

Load this skill for any of the following tasks:

- Reviewing code before a merge or deployment
- Testing a feature, page, or user flow for bugs
- Auditing UI visuals across viewports and states
- Checking accessibility against WCAG 2.1 AA
- Writing test cases for features or components
- Writing bug reports
- Validating form inputs and submission behavior
- Running a pre-launch checklist before going to production

This skill is the source of truth for all QA processes, test case formats, bug report standards, and the pre-launch checklist.

---

# Design System

Figma file: [https://www.figma.com/design/5lX9s52cSgMPq0IlkgIYIC/DS2-%7C-Web-Core?m=auto&node-id=461-185&t=1jaMjS74YgI65TCz-1]

This file contains our team's full design system. When building or styling 
any prototype, pull colors, typography, spacing, and components from the 
relevant page below using the Figma MCP connection — don't guess values or 
recreate a component that already exists.

## Pages

- **Logos** — brand logos and marks
- **Accessibility** — accessibility guidelines/specs
- **Admin** — admin-specific UI patterns
- **Avatar** — avatar/profile image components
- **Area Profile** — profile area layouts
- **Buttons** — button styles and variants
- **Charts** — data visualization components
- **FSD** — [fill in what this stands for]
- **Input** — form inputs and fields
- **Menus** — menu/dropdown components
- **Cards** — card layouts
- **Navigation** — nav bars, sidebars, breadcrumbs
- **Olivia** — 4Insites ai chatbot
- **Page Builder** — page building patterns/templates
- **Responsive** — responsive breakpoint guidance
- **Tables** — table components
- **Tabs/Toggles** — tab and toggle components
- **Tags** — tag/chip components
- **Toaster** — toast/notification components
- **Figma Template** — starter template for new Figma files

## How to use this

Before styling any new prototype, check whether a component already exists 
on the relevant page above. If it does, use the Figma MCP connection to pull 
its exact colors, spacing, and typography rather than approximating it.


# Style Guide

Figma file: [https://www.figma.com/design/3FthH0TAdchY00Irr9MyJK/DS2-%7C-Core-Style-Library?node-id=516-7&t=ui7dHPKIuX8ybI2M-1]

This file contains the colors, text styles, icon styles, and box shadow to be used with our design system

## Pages

- **Cover Image** — file cover, not a working reference page
- **Colors** — core color palette and tokens
- **Text Styles** — typography styles (font families, sizes, weights, line heights)
- **Icon Styles** — icon set and usage guidelines
- **Box Shadow** — elevation/shadow styles

## How to use this

For colors and typography specifically, check this file first — it's the 
source of truth for foundational styles, separate from the component 
library in the Design System file above.


## Stack and Conventions

### Framework
- Next.js 14+ with App Router
- React 18+
- TypeScript (strict mode)
- Tailwind CSS for utility classes
- CSS custom properties for all design tokens

### Folder Structure

```
/app               - Next.js App Router pages and layouts
/components
  /ui              - Primitives: Button, Input, Badge, Icon
  /layout          - Shells: PageWrapper, Grid, Section, Stack
  /patterns        - Assembled patterns: Card, Modal, Nav, Hero
/hooks             - Stateful logic extracted from components
/styles            - Tokens, resets, global CSS
/public            - Static assets
```

### Naming Conventions
- Components: PascalCase (`HeroSection`, `NavBar`, `CardGrid`)
- Event handlers: `handle` + action (`handleSubmit`, `handleToggle`)
- Boolean props and state: `is` or `has` prefix (`isOpen`, `hasError`)
- CSS custom properties: kebab-case with category prefix (`--color-bg`, `--space-4`, `--text-xl`)

### TypeScript Rules
- Strict mode is on. No `any` types.
- All props must be typed with interfaces or type aliases.
- Export types alongside components when they may be reused.

### Tailwind Rules
- Use Tailwind for spacing, layout utilities, and responsive helpers.
- Use CSS custom properties (not Tailwind color classes) for brand colors and design tokens.
- Never use arbitrary Tailwind values (`w-[347px]`). Use the spacing scale or tokens instead.

---

## Sample Data

When building any table, list, or dashboard in this prototype, use `data/associates.csv` and
`data/managers.csv` as the realistic sample data — don't invent placeholder rows (Lorem Ipsum
names, "John Doe", sequential fake emails, etc.).

Both files share the same columns: `Name, Email, Position, Site, Main, Date, Time, Phone, Money,
Shift, Avatar` (plus a second, unlabeled avatar column). `associates.csv` holds frontline roles
(CSR, Custodian, Custodial Supervisor, Sr Custodial Lead, ...); `managers.csv` holds management
roles (Site Mgr, Sr Site Mgr, Assoc Site Mgr, Account Mgr, ...) — pick whichever matches the
persona the UI is showing, or blend both for a mixed roster. `Avatar` URLs point at
`cdn.4insite.com` — real, working image URLs, safe to use directly in `<img>`/`next/image`.

---

## Design Principles

- Dark-first. Default to a dark background unless the design explicitly calls for light.
- Mobile-first. Write base styles for mobile and scale up with `min-width` breakpoints.
- One conceptual direction per component. Commit to it. Do not blend aesthetics.
- No generic "AI slop" aesthetics. Every design decision must be intentional.
- Refer to `.claude/skills/frontend-design.md` for the full checklist before shipping any UI.

---

## What Claude Should Always Do

- Read `.claude/skills/frontend-design.md` before writing any UI code or design output.
- Use CSS custom properties for all colors, spacing, and typography tokens. No hardcoded values.
- Follow the component architecture rules in the skill file.
- Ensure all components are keyboard accessible and meet WCAG 2.1 AA.
- Ask for clarification on the conceptual direction before building anything visual, if it is not already defined.

## What Claude Should Never Do

- Hardcode color values in component code.
- Use `!important` in CSS.
- Create monolithic mega-components.
- Ignore `prefers-reduced-motion`.
