# magic-cursor Context

## Domain Language

### Effect

An Effect is a browser-only pointer visual mounted with `createEffect(name, target?, options?)`.
Each Effect returns a Destroyable and must clean up DOM nodes, event listeners, and transient style
changes from its mount root.

### Mount Root

The Mount Root is the HTMLElement an Effect is attached to. Effects draw or position their DOM and
Canvas layers in the Mount Root coordinate space. If no Mount Root is provided, `document.body` is
used.

### Static Root Snapshot

A Static Root Snapshot is a mount-time DOM mirror of the Mount Root used by lens-style Effects such
as `magnifier` and `invertRing`. It copies the Mount Root background, selected layout and typography
styles, text nodes, and element children into an inert mirror.

The snapshot is intentionally static: when the Mount Root content changes, callers refresh it by
destroying and remounting the Effect. The snapshot excludes every element whose attributes include a
`data-magic-cursor-*` marker so Effect overlays do not recursively appear inside lens content.

The snapshot may copy the Mount Root `className` to preserve author styles. This is part of the
visual approximation contract; complex dynamic content such as pseudo-elements, video, canvas, and
iframes is not guaranteed to be reproduced.
