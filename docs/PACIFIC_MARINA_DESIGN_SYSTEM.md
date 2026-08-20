# Pacific Marina Design System v0.1

## Purpose

Pacific Marina Blue is Swell’s **visual DNA**, not a fixed percentage of a page. Its role is to make the authority library feel clear, navigable, precise, and open without turning the site into coastal hospitality branding or obscuring evidence-led content.

The system will evolve in bounded increments. Each increment must preserve readable text, visible focus, the existing consultative routes, and the distinction between a source-backed statement and an outcome claim.

## Version 0.1 scope

Version 0.1 creates a role-based foundation in the shared stylesheet. It does not introduce a theme picker, a framework migration, a new component library, telemetry, advertising experimentation, or a new public promise.

| Layer | Version 0.1 decision | Reason |
| --- | --- | --- |
| Brand invariant | Pacific Marina Blue represents precision, active navigation, inspectable structure, and open-space atmosphere. | The amount of blue may vary by context while the identity remains recognizable. |
| Color foundation | Retain the existing midnight navy, marina blue, sea-glass blue, mineral paper, fog, restrained coral, amber focus, and legacy lime signal. | Preserves continuity while establishing a coherent blue-first family. |
| Semantic roles | Add roles for canvas, raised surface, primary and secondary text, default and strong border, primary action, focus, supporting accent, and editorial signal. | Components consume a purpose, not a raw color name. |
| Component adoption | Migrate global navigation, buttons, cards, tables, forms, guides, and the CTA panel to semantic roles. | The authority library receives a consistent first increment without a page-by-page visual fork. |
| Accessibility | Preserve a visible focus ring, text hierarchy, and reduced-motion behavior. Color cannot be the only expression of state. | The visual system must remain inspectable and usable. |

## Palette roles

| Role | Current token family | Intended use | Not for |
| --- | --- | --- | --- |
| Canvas | Midnight navy / marine ink | Primary reading field and page atmosphere. | Decorative contrast for its own sake. |
| Raised surface | Deep marine | Cards, forms, menus, and contained decision areas. | A default floating-card effect on every element. |
| Primary action | Pacific Marina Blue | Primary controls and selected/active state. | Every textual emphasis or chart color. |
| Active action | Sea-glass blue | Hover, pressed, and high-attention interactive refinement. | Body copy or low-priority labels. |
| Editorial signal | Legacy lime | Sparse wayfinding, guide labels, and existing familiar signals. | The principal visual identity. |
| Supporting accent | Coral | Rare secondary categorization or human emphasis. | The default call to action. |
| Focus | Amber | Keyboard-visible focus and safety-critical attention. | Brand decoration. |
| Utility colors | Success, warning, danger, information | Future status communication with text or icon support. | Marketing emphasis or unsupported performance claims. |

## Gradual evolution path

| Increment | Change | Success condition | Deferred decision |
| --- | --- | --- | --- |
| v0.1 | Foundation and semantic CSS roles in the shared authority-library stylesheet. | Existing pages retain readable text, focus visibility, and their current CTA destinations. | New product modes or component variants. |
| v0.2 | Component-level tokens for navigation, controls, forms, cards, and editorial figures. | A future page can change a component role without rewriting a raw palette reference. | Runtime theme switching. |
| v0.3 | Controlled modes for editorial, high-contrast, and data-dense contexts only when a real product surface needs them. | A mode has an explicit use case, test, and owner. | Unbounded campaign-specific recoloring. |
| v1.0 | Versioned, portable token source and visual quality gates when more than the static authority library consumes the system. | One source of truth supports multiple approved surfaces without brand drift. | Cross-platform tooling before a second platform needs it. |

## Non-negotiable rules

The site does not casually rotate through unrelated palettes. Coral remains a supporting accent, not the principal CTA color. Pacific Marina Blue is the primary action and identity family; midnight navy and mineral paper provide structure and space. Existing lime remains a measured editorial signal during the transition, and the compatibility alias stays in place until all pages use semantic roles.

Visual changes never create or imply a customer result, proof, ranking, citation, conversion, or third-party system behavior. No state relies on color alone. Motion communicates a meaningful state change and yields to reduced-motion preferences.

## Design ownership

The shared stylesheet is the current source of truth for the static Swell authority library. This document is the versioned migration record. Future changes must update both the semantic role map and the relevant validation coverage before a production release.
