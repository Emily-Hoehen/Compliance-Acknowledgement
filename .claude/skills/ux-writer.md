---
name: ux-writer
description: >
  Apply UX writing best practices to all interface copy, microcopy, and content design. Use this skill whenever writing or reviewing UI text including button labels, error messages, empty states, onboarding flows, tooltips, modals, form labels, placeholder text, success and confirmation messages, navigation labels, and any copy that appears inside a product interface. Also use for content audits, voice and tone guides, and writing pattern libraries. Trigger even for short tasks like a single button label or a 404 message.
---

# UX Writer Skill

This skill enables Claude to act as a senior UX writer and content designer. It covers interface copy, microcopy systems, voice and tone, writing patterns, and content audits. Every word in an interface is a design decision. This skill ensures those decisions are intentional.

---

## Core Philosophy

- **Clarity over cleverness.** The best UI copy is invisible. Users should never have to think about what a word means.
- **Every word earns its place.** If a word can be removed without losing meaning, remove it.
- **Write for the moment.** Copy must match the user's mental state at that exact point in the experience: onboarding, error recovery, success, empty state, and so on.
- **Voice is consistent. Tone is contextual.** The product's voice stays the same everywhere. The tone adjusts to the situation.
- **Copy and design are the same discipline.** Never treat words as a layer applied after design. Content shapes layout. Layout shapes content.

---

## When to Use Each Module

| Request Type | Module to Apply |
|---|---|
| "Write button copy / CTAs" | Microcopy: Actions |
| "Write error messages" | Microcopy: Errors and Validation |
| "Write empty states" | Microcopy: Empty States |
| "Write onboarding copy" | Microcopy: Onboarding |
| "Write form labels / placeholders" | Microcopy: Forms |
| "Write tooltips / helper text" | Microcopy: Tooltips and Help |
| "Audit my UI copy" | Content Audit |
| "Define our voice and tone" | Voice and Tone Guide |
| "Build a writing pattern library" | Writing Patterns |

---

## Module 1: Microcopy

### Actions (Buttons, CTAs, Links)

**Rules:**
- Use verb-first labels: "Save changes" not "Changes saved"
- Be specific: "Download report" not "Download"
- Never use "Click here" or "Learn more" as standalone labels
- Match the label to the outcome: if the action is irreversible, signal it ("Delete forever", "Remove permanently")
- Primary CTA: 1-3 words. Secondary CTA: slightly more descriptive is acceptable.
- Avoid jargon, technical terms, or internal naming that users would not recognize

**Patterns:**

| Context | Weak | Strong |
|---|---|---|
| Form submission | Submit | Save profile |
| Account creation | Register | Create account |
| File action | Upload | Add your file |
| Destructive action | Delete | Delete forever |
| Navigation | Go | View dashboard |
| Purchase | Buy | Get started for $X |

---

### Errors and Validation

**Rules:**
- Never blame the user. "Invalid input" is a failure. "Please enter a valid email" is better. "This doesn't look like an email address" is best.
- Always tell the user what went wrong AND what to do next.
- Be specific. "Something went wrong" is unacceptable unless the cause is genuinely unknown.
- Match error copy tone to severity: inline validation is gentle, system errors can be more direct.
- Inline validation fires on blur, not on keystroke (do not shame the user mid-typing).

**Structure every error message with:**
1. What happened (brief, non-technical)
2. Why (if it helps the user fix it)
3. What to do next

**Patterns:**

| Error Type | Weak | Strong |
|---|---|---|
| Empty required field | Field is required | Enter your email to continue |
| Invalid format | Invalid email | This doesn't look like an email address |
| Password too short | Password too short | Password must be at least 8 characters |
| Network failure | Error 500 | We could not connect. Check your internet and try again. |
| Permission denied | Access denied | You do not have permission to view this. Contact your admin. |
| Not found | 404 Error | We could not find that page. It may have moved or been deleted. |

---

### Empty States

**Rules:**
- Empty states are product moments, not edge cases. Write them intentionally.
- Every empty state needs: a short headline, a brief explanation, and a clear action.
- Tone should be encouraging, not apologetic.
- Never show a blank screen or a raw "No results found" without context.

**Three types of empty states:**

| Type | When | Tone | Example |
|---|---|---|---|
| First use | User has not added anything yet | Inviting, guiding | "Your projects will live here. Start by creating your first one." |
| No results | Search or filter returned nothing | Helpful, redirecting | "No results for 'dashboard'. Try a different search or browse all templates." |
| Cleared state | User deleted or completed everything | Celebratory or neutral | "All caught up. Nothing left to review." |

---

### Onboarding

**Rules:**
- Onboarding copy must reduce anxiety and build momentum, not overwhelm.
- Every onboarding step should have one job. One message. One action.
- Progress indicators must be honest. Never say "Almost done" on step 2 of 8.
- Welcome messages should name what the user just unlocked, not just say "Welcome."
- Contextual onboarding (tooltips, coach marks) is always better than front-loaded modals.

**Onboarding Copy Structure:**

```
Headline:   [What this step gives the user]
Body:       [1-2 sentences max. What to do and why it matters.]
CTA:        [Specific action verb + outcome]
Skip path:  [If skippable: "Set up later" not "Skip"]
```

---

### Forms

**Rules:**
- Every field needs a label. Placeholder text is not a label.
- Labels are above the field, not inside it (inside labels disappear on focus).
- Placeholder text shows an example, not a repetition of the label.
- Helper text goes below the field and explains format or requirements before the user makes an error.
- Required fields: mark optional fields as "(optional)" rather than required fields with an asterisk. Most fields in a well-designed form should be required.

**Patterns:**

| Element | Weak | Strong |
|---|---|---|
| Label | Email | Email address |
| Placeholder | Enter email | name@company.com |
| Helper text | (none) | We'll send your receipt here |
| Error | Invalid | Enter a valid email address |
| Success | OK | Email confirmed |

---

### Tooltips and Help Text

**Rules:**
- Tooltips explain non-obvious things. If the UI already makes it clear, no tooltip is needed.
- Keep tooltips under 2 sentences. If you need more, the UI has a design problem.
- Do not use tooltips for critical information. Critical info must be visible without hover.
- Help text (below fields or sections) should prevent errors before they happen, not after.

---

## Module 2: Voice and Tone Guide

### Defining Voice

Voice is the product's consistent personality. It does not change based on context.

**Define voice across four dimensions:**

| Dimension | Questions to Answer |
|---|---|
| Character | If this product were a person, how would you describe them in 3 adjectives? |
| Values | What does this product believe in? What does it stand against? |
| Vocabulary | What words do we always use? What words do we never use? |
| Relationship | How does this product see its users? Partner? Expert? Guide? |

**Output format for a voice definition:**

```
## Our Voice

We are [3 adjectives].

We sound like [a human analogy: "a knowledgeable friend," "a calm expert," etc.].

We believe [core value statement].

We always:
- [Writing behavior 1]
- [Writing behavior 2]
- [Writing behavior 3]

We never:
- [Anti-pattern 1]
- [Anti-pattern 2]
- [Anti-pattern 3]
```

---

### Defining Tone

Tone shifts based on the user's situation. Map tone to context:

| User Situation | Appropriate Tone | Avoid |
|---|---|---|
| First visit / signup | Warm, welcoming, low-pressure | Salesy, overwhelming |
| Active productive use | Efficient, clear, out of the way | Chatty, distracting |
| Error / frustration | Calm, direct, helpful | Apologetic, technical, blaming |
| Success / completion | Positive, brief, affirming | Over-celebrating, sycophantic |
| Destructive action | Serious, clear, no humor | Casual, dismissive |
| Empty / idle state | Encouraging, action-oriented | Apologetic, negative |

---

## Module 3: Content Audit

### Purpose
Review existing UI copy across a product or page and identify issues, inconsistencies, and improvements.

### Output Format

```
# UX Writing Audit: [Product / Page Name]
## Date: [today]

### Summary
2-3 sentence overview of overall copy quality and top priorities.

### Critical Issues
| Location | Current Copy | Problem | Recommended Fix |
|---|---|---|---|

### Inconsistencies
| Issue | Locations | Recommended Standard |
|---|---|---|

### Quick Wins
| Location | Current | Suggested |
|---|---|---|

### Voice and Tone Assessment
Is the copy consistent with the intended voice? Where does it drift?

### Priority Action Plan
Numbered list in priority order.
```

### Audit Checklist

**Clarity**
- [ ] No jargon or internal terminology visible to users
- [ ] Every action label starts with a verb
- [ ] Error messages explain what happened and what to do next
- [ ] No ambiguous labels ("Manage", "Settings", "More" without context)

**Consistency**
- [ ] Same terms used for same concepts throughout (e.g., not "delete" in one place and "remove" in another)
- [ ] Capitalization style consistent (sentence case vs. title case — pick one)
- [ ] Button labels follow same pattern across similar actions
- [ ] Date, time, and number formats are consistent

**Tone**
- [ ] Copy matches the emotional context of each screen
- [ ] No errors or destructive actions use playful or casual language
- [ ] Success messages are brief and not excessive
- [ ] Onboarding does not overwhelm

**Completeness**
- [ ] All empty states have copy
- [ ] All error states have copy
- [ ] All loading states have copy (or are intentionally blank)
- [ ] All modals and dialogs have a clear headline and CTA

---

## Module 4: Writing Patterns Library

A writing patterns library documents the approved copy patterns for recurring UI situations. Build one when a product has more than one writer, or when consistency is breaking down.

### Pattern Entry Format

```
## Pattern: [Name]

**When to use:** [Situation or trigger]
**Tone:** [Appropriate tone for this context]

### Template
[Copy template with variables in brackets]

### Examples
- [Example 1]
- [Example 2]

### Do
- [Approved behavior]

### Do Not
- [Anti-pattern to avoid]
```

### Starter Pattern Set

**Confirmation dialogs:**
- Headline: "[Action] [object]?" (e.g., "Delete this project?")
- Body: Explain what will happen, especially if irreversible.
- Confirm CTA: Repeat the action ("Delete project")
- Cancel CTA: "Cancel" (never "No" or "Go back")

**Loading states:**
- Short tasks (under 3 seconds): No copy needed, spinner only
- Medium tasks (3-10 seconds): "Loading your data..." or task-specific ("Generating your report...")
- Long tasks (10+ seconds): Progress indicator + estimated time if possible ("This usually takes about 30 seconds")

**Success messages:**
- Inline: "[Thing] saved." "[File] uploaded."
- Toast: Brief, specific, auto-dismiss after 4-5 seconds
- Never: "Great job!" "Awesome!" "You did it!" (sycophantic)

**Notifications:**
- Lead with the most important information
- Tell the user what happened, not just that something happened
- Include a clear action if one is available

---

## Output Checklist

Before finalizing any UX copy output, verify:

- [ ] Every action label starts with a verb
- [ ] No "Click here," "Learn more," or "Submit" used as standalone labels
- [ ] All error messages explain what went wrong and what to do next
- [ ] Empty states have a headline, explanation, and action
- [ ] Placeholder text is an example, not a repeated label
- [ ] Tone matches the user's emotional context on that screen
- [ ] Capitalization is consistent (sentence case preferred for UI)
- [ ] No jargon or internal terminology
- [ ] No unnecessary words (read every sentence and remove what does not earn its place)
- [ ] Copy has been read aloud (if it sounds unnatural spoken, rewrite it)
