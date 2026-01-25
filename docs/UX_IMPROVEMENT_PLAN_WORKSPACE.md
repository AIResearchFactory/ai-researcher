# UX Improvement Plan: Main Workspace

## Overview
Transform the "Dark/Flat" workspace into a "Premium Glassmorphism" experience, matching the quality of the Onboarding flow.

## Design Concept
- **Theme**: Deep Violet/Blue gradients, Glassmorphism (blur + semi-transparent), Modern Typography (Inter/Outfit).
- **Layout**: 3-Column (Sidebar, Editor, Chat).
- **Aesthetics**: Floating panels, subtle shadows, rounded corners, micro-interaction animations.

## Component Specifics

### 1. Main Layout (Workspace.tsx / MainPanel.tsx)
- **Background**: Use the same "grainy gradient" noise background as Onboarding.
- **Panels**:
  - **Sidebar**: Glass pane, semi-transparent.
  - **Editor**: Central stage, floating glass card look or clean canvas.
  - **Chat**: Floating glass panel on the right.

### 2. Markdown Editor (MarkdownEditor.tsx)
- **Container**: Remove full-width stretch. Center content with `max-w-3xl mx-auto` and shadow/border for a "Paper" feel.
- **Typography**: Optimize `prose` classes for readability.
- **Header**: Floating toolbar instead of rigid top bar.

### 3. Chat Panel (ChatPanel.tsx)
- **Messages**:
  - User: Gradient background (Primary -> Purple).
  - AI: Glass background with border.
- **Input**: Floating capsule design at the bottom.
- **Header**: Minimalist, glass.

### 4. Sidebar (Sidebar.tsx)
- **Style**: Update to use `GlassCard` or equivalent classes.
- **Navigation**: Better hover states, active states with "glow".

## Implementation Strategy
1. **Foundation**: Add background assets/styles to `Workspace.tsx`.
2. **Editor Polish**: Update `MarkdownEditor.tsx`.
3. **Chat Polish**: Update `ChatPanel.tsx`.
4. **Resizing**: Ensure the new "Floating" look works with the resize handle (resize handle might need to be a visible "gutter").
