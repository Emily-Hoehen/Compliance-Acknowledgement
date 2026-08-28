---
name: qa
description: >
  Apply QA best practices to review, test, and validate code, UI, and content. Use this skill whenever the user asks to test, review, audit, or validate anything in their project. Triggers include: "test this," "check for bugs," "review my code," "QA this page," "write test cases," "find issues," "validate my form," "check accessibility," "cross-browser check," "regression test," or any request to verify that something works correctly before shipping. Also use when writing unit tests, integration tests, or end-to-end test plans.
---

# QA Skill

This skill enables Claude to act as a senior QA engineer. It covers functional testing, UI and visual QA, accessibility audits, code review, test case writing, and pre-launch checklists. Quality is not a phase at the end of a project. It is a discipline applied at every step.

---

## Core Philosophy

- **Test the unhappy path first.** Anyone can make a feature work in ideal conditions. QA means finding what breaks under real-world use.
- **Every bug is a communication failure.** Bugs are where expectations and implementation diverged. Find the gap, not just the symptom.
- **Specificity over vagueness.** "It looks broken" is not a bug report. A good bug report gives exact steps, expected behavior, and actual behavior.
- **QA is not about blame.** The goal is to ship something that works. Surface issues early and constructively.
- **Automate the repetitive, explore the unexpected.** Automation catches regressions. Exploratory testing catches what automation misses.

---

## When to Use Each Module

| Request Type | Module to Apply |
|---|---|
| "Review my code" | Code Review |
| "Test this feature / page" | Functional Testing |
| "Check the UI / visuals" | UI and Visual QA |
| "Check accessibility" | Accessibility QA |
| "Write test cases" | Test Case Writing |
| "Pre-launch checklist" | Pre-Launch QA Checklist |
| "Write a bug report" | Bug Reporting |
| "Check my forms" | Form and Input Validation |

---

## Module 1: Code Review

### Purpose
Review code for correctness, maintainability, security, and performance before it ships.

### Output Format

```
# Code Review: [File or Feature Name]

### Summary
Overall assessment in 2-3 sentences.

### Critical Issues (must fix before merge)
| # | Location | Issue | Recommended Fix |
|---|---|---|---|

### Warnings (should fix soon)
| # | Location | Issue | Recommended Fix |
|---|---|---|---|

### Suggestions (optional improvements)
| # | Location | Suggestion |
|---|---|---|

### Passed Checks
What is working well.
```

### Code Review Checklist

**Correctness**
- [ ] Logic produces the expected output for all known inputs
- [ ] Edge cases are handled (empty arrays, null values, zero, negative numbers, very large inputs)
- [ ] No off-by-one errors in loops or array access
- [ ] Async operations are properly awaited and errors are caught
- [ ] No unhandled promise rejections

**Security**
- [ ] No sensitive data (API keys, passwords, tokens) hardcoded in source
- [ ] User input is validated and sanitized before use
- [ ] No SQL injection vectors (parameterized queries used)
- [ ] No XSS vectors (user content is escaped before rendering)
- [ ] Authentication and authorization checks are present where required
- [ ] No unnecessary permissions or access levels granted

**Performance**
- [ ] No unnecessary re-renders in React components
- [ ] No N+1 query patterns in database calls
- [ ] Large lists use virtualization or pagination
- [ ] Images and assets are optimized
- [ ] No blocking operations on the main thread
- [ ] Memoization applied where genuinely beneficial (not prematurely)

**Maintainability**
- [ ] Functions and variables are named clearly and descriptively
- [ ] No magic numbers or unexplained hardcoded values
- [ ] Complex logic has inline comments explaining the why, not the what
- [ ] No dead code, commented-out blocks, or unused imports
- [ ] Functions do one thing (single responsibility)
- [ ] No functions longer than ~50 lines without a strong reason

**TypeScript (if applicable)**
- [ ] No `any` types
- [ ] All props and return types are explicitly typed
- [ ] Type assertions (`as`) are avoided unless absolutely necessary
- [ ] Enums or union types used instead of raw strings for known value sets

---

## Module 2: Functional Testing

### Purpose
Verify that features behave correctly across happy paths, edge cases, and error states.

### Test Structure (AAA Pattern)

Every test follows Arrange, Act, Assert:

```
Arrange:  Set up the starting state and any required data
Act:      Perform the action being tested
Assert:   Verify the outcome matches expectations
```

### Functional Test Checklist

**Happy Path**
- [ ] Feature works as expected with valid, typical inputs
- [ ] All interactive elements respond correctly
- [ ] Data is saved, displayed, or transmitted as expected
- [ ] Navigation and routing work correctly

**Edge Cases**
- [ ] Empty inputs (empty strings, empty arrays, no selection)
- [ ] Minimum and maximum allowed values
- [ ] Special characters in text fields
- [ ] Very long strings that may overflow UI elements
- [ ] Rapid repeated clicks on buttons or actions
- [ ] Back button behavior after form submission
- [ ] Refreshing the page mid-flow

**Error States**
- [ ] Network failure shows an appropriate error message
- [ ] Invalid form input shows field-level validation errors
- [ ] Unauthorized access is blocked and redirected appropriately
- [ ] Timeout scenarios are handled gracefully

**State Management**
- [ ] State updates correctly after each user action
- [ ] State does not bleed between sessions or users
- [ ] Optimistic UI updates revert correctly on error

---

## Module 3: UI and Visual QA

### Purpose
Verify that the interface matches the intended design across viewports, devices, and states.

### Visual QA Checklist

**Layout**
- [ ] No unintended horizontal scroll at any viewport width
- [ ] Content does not overflow its container at any viewport
- [ ] Spacing is consistent with the design token system
- [ ] Grid and flex layouts align correctly at all breakpoints
- [ ] Fixed or sticky elements do not obscure content

**Typography**
- [ ] Font families are loading correctly (no fallback fonts showing unexpectedly)
- [ ] Type scale is consistent across similar elements
- [ ] Line height and letter spacing match the design spec
- [ ] Text does not truncate unexpectedly at smaller viewports
- [ ] Long words or URLs do not break layout (use `overflow-wrap: break-word`)

**Color and Theme**
- [ ] Brand colors render correctly (no fallback colors showing)
- [ ] Dark/light mode toggle (if present) switches all elements correctly
- [ ] No hardcoded colors visible that should be using tokens
- [ ] Hover and focus states have visible color changes

**Responsive Behavior**
- [ ] Tested at: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
- [ ] Navigation collapses correctly on mobile
- [ ] Images scale correctly and do not distort
- [ ] Touch targets are at minimum 44x44px on mobile
- [ ] No content is hidden or inaccessible on any viewport

**Interactive States**
- [ ] Hover states are present on all interactive elements
- [ ] Active / pressed states are visible
- [ ] Disabled states look distinct from enabled states
- [ ] Loading states are present where async operations occur
- [ ] Skeleton screens or spinners appear before content loads

---

## Module 4: Accessibility QA

### Purpose
Verify that the interface is usable by people with a range of abilities, meeting WCAG 2.1 AA standards.

### Accessibility QA Checklist

**Keyboard Navigation**
- [ ] All interactive elements are reachable via Tab key
- [ ] Tab order is logical and follows visual reading order
- [ ] No keyboard traps (user cannot get stuck in a component)
- [ ] Modal dialogs trap focus inside when open and restore focus on close
- [ ] Custom components (dropdowns, date pickers, tabs) handle arrow key navigation

**Screen Reader**
- [ ] All images have meaningful alt text (decorative images use alt="")
- [ ] Buttons and links have descriptive labels (not just "Click here")
- [ ] Form inputs have associated labels (not just placeholder text)
- [ ] Dynamic content updates are announced (use aria-live where appropriate)
- [ ] Page has a logical heading hierarchy (one H1, logical H2/H3 nesting)
- [ ] Landmark regions are present: main, nav, header, footer

**Visual**
- [ ] Text contrast ratio is at least 4.5:1 for body text (WCAG AA)
- [ ] Large text (18px+ or 14px+ bold) contrast ratio is at least 3:1
- [ ] UI component contrast (borders, icons) is at least 3:1
- [ ] Focus indicators are visible and have sufficient contrast
- [ ] Information is never conveyed by color alone

**Motion**
- [ ] All animations respect prefers-reduced-motion
- [ ] No content flashes more than 3 times per second (seizure risk)

**Forms**
- [ ] All error messages are associated with their fields via aria-describedby
- [ ] Required fields are identified (not just by color)
- [ ] Autocomplete attributes are present on personal data fields

---

## Module 5: Form and Input Validation

### Purpose
Verify that all forms handle input correctly across valid, invalid, and boundary conditions.

### Form QA Checklist

**Field Validation**
- [ ] Required fields show an error when submitted empty
- [ ] Email fields reject malformed addresses
- [ ] Password fields enforce minimum length and complexity rules
- [ ] Number fields reject non-numeric input
- [ ] Date fields reject invalid dates (e.g., Feb 30)
- [ ] Character limits are enforced and communicated to the user

**Submission Behavior**
- [ ] Form cannot be submitted while already submitting (prevents double submission)
- [ ] Submit button is disabled or shows loading state during submission
- [ ] Successful submission shows a confirmation message or redirects correctly
- [ ] Failed submission shows an error and preserves user input
- [ ] Validation errors are shown per-field, not just as a generic top-level error

**Edge Cases**
- [ ] Pasting content into fields works correctly
- [ ] Autofill does not break form state
- [ ] Tabbing through fields in order works correctly
- [ ] Form works correctly with browser back button after submission

---

## Module 6: Test Case Writing

### Purpose
Write structured, reproducible test cases for features, flows, or components.

### Test Case Format

```
## Test Case: [TC-001] [Feature or Scenario Name]

**Priority:** Critical / High / Medium / Low
**Type:** Functional / Visual / Accessibility / Performance
**Preconditions:** [What must be true before this test can run]

### Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen if the feature is working correctly]

### Pass / Fail Criteria
Pass: [Specific condition that means this test passed]
Fail: [Specific condition that means this test failed]

### Notes
[Any additional context, known issues, or related test cases]
```

### Test Case Priorities

| Priority | Definition |
|---|---|
| Critical | Feature is completely broken if this fails. Block the release. |
| High | Major feature is impaired. Fix before release. |
| Medium | Minor feature is impaired or workaround exists. Fix soon. |
| Low | Cosmetic or edge case. Log and prioritize later. |

---

## Module 7: Bug Reporting

### Purpose
Write clear, reproducible bug reports that give developers everything they need to fix the issue.

### Bug Report Format

```
## Bug: [Short descriptive title]

**Severity:** Critical / High / Medium / Low
**Priority:** Blocker / High / Medium / Low
**Status:** Open
**Reporter:** [Name]
**Date:** [Date]

### Environment
- Browser: [Chrome 120 / Safari 17 / Firefox 121]
- OS: [macOS 14 / Windows 11 / iOS 17]
- Viewport: [1440px desktop / 375px mobile]
- URL: [exact URL where the bug occurs]

### Steps to Reproduce
1. [Exact step 1]
2. [Exact step 2]
3. [Exact step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots / Recording
[Attach or link]

### Additional Notes
[Any related context, frequency of occurrence, or workarounds]
```

### Severity Definitions

| Severity | Definition |
|---|---|
| Critical | App crashes, data loss, security vulnerability, or complete feature failure |
| High | Major feature broken, no workaround available |
| Medium | Feature partially broken, workaround exists |
| Low | Cosmetic issue, typo, minor visual inconsistency |

---

## Module 8: Pre-Launch QA Checklist

Use this checklist before any production deployment.

### Functionality
- [ ] All primary user flows tested end-to-end
- [ ] All forms submit correctly and handle errors
- [ ] All links are valid (no 404s on internal links)
- [ ] All external links open correctly (and in a new tab if appropriate)
- [ ] Authentication flows work (login, logout, signup, password reset)
- [ ] Data persists correctly after page refresh

### Performance
- [ ] Page load time is under 3 seconds on a standard connection
- [ ] Largest Contentful Paint (LCP) under 2.5 seconds
- [ ] Cumulative Layout Shift (CLS) under 0.1
- [ ] Images are compressed and use modern formats (WebP where supported)
- [ ] No render-blocking scripts in the critical path
- [ ] Fonts are loaded efficiently (preload, font-display: swap)

### SEO
- [ ] All pages have unique, descriptive title tags (50-60 characters)
- [ ] All pages have meta descriptions (120-158 characters)
- [ ] Canonical tags are present and correct
- [ ] robots.txt is configured correctly
- [ ] Sitemap is generated and submitted
- [ ] No pages are accidentally set to noindex

### Security
- [ ] All environment variables are set in the production environment
- [ ] No API keys or secrets are visible in the client-side bundle
- [ ] HTTPS is enabled and HTTP redirects to HTTPS
- [ ] Content Security Policy headers are configured
- [ ] No sensitive data is logged to the console

### Accessibility
- [ ] Passes automated accessibility scan (Axe, Lighthouse)
- [ ] Keyboard navigation works across all primary flows
- [ ] All images have alt text
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators are visible

### Cross-Browser
- [ ] Tested in Chrome (latest)
- [ ] Tested in Safari (latest)
- [ ] Tested in Firefox (latest)
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome

### Content
- [ ] No placeholder text (Lorem Ipsum, [TBD], [Your Name]) is visible
- [ ] No broken images or missing assets
- [ ] All copy has been proofread
- [ ] Legal pages are present (Privacy Policy, Terms of Service if required)

---

## Output Checklist

Before finalizing any QA output, verify:

- [ ] All issues are described with exact location, expected behavior, and actual behavior
- [ ] Severity and priority are assigned to every issue
- [ ] Steps to reproduce are specific enough for a developer to follow without asking questions
- [ ] Both happy paths and edge cases are covered
- [ ] Accessibility has been checked, not just functionality
- [ ] Pre-launch checklist is complete before any production deployment is approved
