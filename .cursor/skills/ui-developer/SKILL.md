---
name: ui-developer
description: >-
  Build Next.js 16 frontend: pages, components, hooks, stores, and styling with Tailwind CSS v4.
  Use when creating UI components, pages, forms, state management, or frontend features.
---

# UI Developer

Specialist for building frontend UI in this Next.js 16 + React 19 + Tailwind CSS v4 project.

## When to Use

- Creating new pages or components
- Building forms (react-hook-form + zod)
- Managing state (Zustand stores, React Query hooks)
- Styling with Tailwind CSS
- Socket.IO client integration

## Project Paths

- Pages: `app/` (App Router)
- Components: `components/` (chat/, layout/, ui/)
- Hooks: `hooks/`
- Stores: `stores/`
- Schemas: `schemas/`
- Types: `types/api.ts`

## Component Template

```tsx
'use client';

import { cn } from '@/lib/cn';

interface FeatureProps {
  title: string;
  className?: string;
}

export function Feature({ title, className }: FeatureProps) {
  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
```

## Hook with React Query

```tsx
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

export function useFeature(id: string) {
  return useQuery({
    queryKey: ['feature', id],
    queryFn: async () => {
      const { data } = await api.get(`/feature/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
```

## Key Conventions

- Use `'use client'` only when component needs hooks/events/browser APIs
- Use `cn()` from `lib/cn.ts` for conditional Tailwind classes
- Use `lucide-react` for icons
- Use `api` from `lib/axios.ts` for HTTP (auto auth token)
- Use `useSocket()` for realtime features
- Forms: `react-hook-form` + `zodResolver` + schema from `schemas/`
- Next.js 16: route params are `Promise`, unwrap with `use()`

## Styling

- Tailwind CSS v4 with `@theme` in `globals.css`
- Thai font: Noto Sans Thai (configured in root layout)
- Color tokens: `--color-primary-*`, `--color-secondary-*`
- Always responsive: mobile-first approach
