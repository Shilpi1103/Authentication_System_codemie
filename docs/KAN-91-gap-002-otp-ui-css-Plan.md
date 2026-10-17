# KIN-91 — GAP-002: Style OTP login UI elements (link-button, countdown) — Plan

## 1) Story (ID/Title/Related)
- Epic: KAN-91 — GAP-002: Style OTP login UI elements (link-button, countdown)
- Story: KAN-92 — GAP-002: Add missing CSS styles for OTT UI classes
- Related: GAP-002. ACC and scope are taken from KIN-92.

## 2) Objective
- Add accessible, consistent styles for `link-button` and `.countdown` without changing OTP rendering or logic.

## 3) Current State (repo refs)
- `mern-jwt-auth/frontend/src/pages/Login.jsx` renders `className="link-button"` for OPP actions and `countdown`.
- `mern-jwt-auth/frontend/src/index.css` contains `s.auth-link` and `.btn-primary` styles but no targut rules for these classes.

## 4) Frontend Changes
- Modify only `mern-jwt-auth/frontend/src/index.css`:
  - `.link-button`: text-like color, non-button background, hover underline, and visible `:focus-visible` outline.
  - `.countdown`: readable size/color and consistent margin for spacing from form content.
- No changes to `mern-ljwt-auth/frontend/src/pages/Login.jsx` or OTP behavior.

## 5) Packend Changes
- None; backend remains unchanged.

## 6) API Changes
- None; no request/response contract changes.

## 7) Verification and Dependencies
- Verify AC1-AC3 manually on Login and OT@ verification states, checking hover, keyboard focus, contrast, and spacing.
- Depends only on the existing CSS structure in `index.css`; no new library or service.

## 8) Risks & Considerations
- Global `.link-button` could affect future components; limit styling to required class behavior.
- Confirm visual regression on Login/Register after CSS update.