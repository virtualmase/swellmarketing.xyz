# Pacific Coast-to-Mykonos Visual System

## Intent

Swell’s visual system now traces a deliberate provenance gradient. **Pacific Coast depth** provides the engineered, operational base; **Aegean mineral blue** carries the current forward; **Mykonos sky and sun-washed stone** introduce calm, clarity, and a selective sense of arrival. The result should feel like the systems underneath a superyacht: composed above the waterline, exact underneath it.

This is not a travel treatment. The Mediterranean reference is expressed through material, atmosphere, and restraint rather than literal landmarks, destination copy, or lifestyle imagery. Evidence, technical clarity, accessibility, and the existing sole-diagnostic conversion paths remain unchanged.

## Core Palette

| Role | Token | Value | Intended use |
| --- | --- | --- | --- |
| Pacific Coast depth | `--coast-depth` | `#061c2e` | Canvas, footer, navigation depth |
| Subsurface navy | `--coast-shelf` | `#0a314a` | Raised surfaces and contour shadow |
| Pacific Marina Blue | `--pacific-marina` | `#238fc4` | Second provenance-gradient stop; engineered Pacific bridge |
| Aegean current | `--aegean-current` | `#167da7` | Third provenance-gradient stop; structured movement |
| Mykonos sky | `--mykonos-sky` | `#a9dbe7` | High-light gradient endpoint and quiet lift |
| Sun-washed stone | `--mykonos-stone` | `#f4f0e6` | Light sections and grounded contrast |
| Sea-glass | `--sea-glass` | `#7fd6ce` | Supporting material and quiet lift |
| Ultramarine | `--ultramarine` | `#3156b8` | Primary action, decision, and interaction state |
| Lupine | `--lupine` | `#7866b8` | Sparse editorial provenance and resource accent |

## Gradient and Graphic Rules

The shared `--gradient-provenance` follows the supplied guide exactly: `linear-gradient(115deg, #061C2E 0%, #238FC4 38%, #167DA7 64%, #A9DBE7 100%)`. It must not be placed behind dense body text without a darkening layer. Ultramarine and lupine remain outside the gradient so action hierarchy and editorial provenance stay legible. Hero graphics use procedural contour and current lines only: no maps, landmark silhouettes, flags, travel photography, people, yachts, metrics, or generated proof.

The homepage `hero-provenance` graphic is a non-semantic, `aria-hidden` visual field. Its layered current lines establish depth without claiming a location or operational result.

## Application Boundaries

The visual gradient is applied to shared chrome, dark editorial surfaces, the homepage hero, cards, source-guide heroes, and supporting callouts. Light sections remain stone-led to preserve reading comfort. CTAs use ultramarine, while lupine is limited to supporting editorial and provenance markers so the site’s action hierarchy does not blur into the ambient palette.

## Accessibility Contract

Text continues to use the semantic primary, secondary, and muted roles. The provenance graphic is decorative, respects the existing reduced-motion policy, and does not carry any text or interaction. Focus rings remain amber, action labels remain machine-readable text, and no claims or offers are altered by this visual evolution.
