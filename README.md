# Claude Code Project Starter

A ready-to-go Next.js starter built for the Zero to Hero course. Everything is pre-wired so you can start building with Claude Code immediately.

---

## What's Included

```
project-starter/
├── CLAUDE.md                          ← Claude's instruction file (read this first)
├── .claude/
│   ├── agents/                        ← Agent role definitions
│   │   ├── frontend-designer.md
│   │   ├── ux-writer.md
│   │   └── qa-reviewer.md
│   └── skills/                        ← Knowledge bases per domain
│       ├── frontend-design.md
│       ├── ux-writer.md
│       └── qa.md
├── app/
│   ├── layout.tsx                     ← Root layout
│   ├── page.tsx                       ← Starter home page
│   └── globals.css                    ← Design tokens + base styles
├── components/
│   ├── ui/                            ← Primitives: Button, Input, Badge
│   ├── layout/                        ← Shells: PageWrapper, Grid, Section
│   └── patterns/                      ← Assembled: Card, Nav, Hero
├── data/                              ← Sample data (associates.csv, managers.csv)
├── hooks/                             ← Custom React hooks
├── styles/                            ← Additional global styles
└── public/                            ← Static assets
```

---

## Getting Started

**1. Copy the template**

Copy the `template` folder from the `4insite-prototypes` repo and rename it to your prototype's name — don't clone it as its own repo.

```bash
cp -r template your-prototype-name
cd your-prototype-name
```

**2. Install dependencies**

```bash
npm install
```

**3. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your starter running.

**4. Open in VS Code with Claude Code**

```bash
code .
```

Claude Code will automatically read `CLAUDE.md` when you start your session.

---

## How the System Works

This starter uses a two-layer system to give Claude persistent, project-aware instructions:

**Layer 1: Skills** (`.claude/skills/`) are knowledge bases. Each one defines what Claude knows about a specific domain (design, copy, QA).

**Layer 2: Agents** (`.claude/agents/`) are roles. Each agent maps to one skill but adds a persona, defined inputs and outputs, and an output format. An agent is a skill operating with intent.

`CLAUDE.md` is the entry point. It tells Claude what the project is and points to the relevant skill for the task at hand.

You can extend this. Add new skills to `.claude/skills/`. Add new agents to `.claude/agents/`. Reference them from `CLAUDE.md`.

See `.claude/agents-and-skills-usage.md` for a full guide to using the agents and skills in this project.

---

## Customize It

Design tokens (`app/globals.css`) and the core components (`Button`, `Input`, `Nav`) are already wired to 4Insite's real DS2 design system — there's no placeholder color palette, font stack, or component styling to swap out. Jump straight into building your prototype's actual pages and features.

---

## Stack

- [Next.js 14](https://nextjs.org/) with App Router
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [Tailwind CSS](https://tailwindcss.com/)
- CSS custom properties for all design tokens

---

