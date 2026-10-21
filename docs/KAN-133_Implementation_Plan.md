KAN-133 Implementation Plan

Story: KAN-133
Title: GAP UI-001: Improve authentication UI accessibility and mobile responsiveness

1. Story Overview

This implementation plan covers frontend changes to improve accessibility (WCAG-aligned basics) and mobile responsiveness for the MERN JWT Authentication System. Scope is limited to the existing React frontend in mern-jwt-auth/frontend and focuses on Login, Register, Dashboard and OTP flows.

2. Business Objective

Improve accessibility and mobile usability to increase conversions, reduce support friction, and enable users who rely on assistive technologies to complete authentication flows reliably.

3. Impacted Components

- Frontend (React + Vite)
  - src/pages/Login.jsx
  - src/pages/Register.jsx
  - src/pages/Dashboard.jsx
  - src/index.css
  - src/pages/Login.test.jsx (unit tests)
  - src/services/authService.js (minor notes: no token storage change in this story)

4. Functional Changes

- Add ARIA attributes to inputs and interactive controls (aria-label or aria-labelledby) where labels exist.
- Ensure feedback messages use role="alert" so screen readers announce them immediately.
- Set focus to the first input on mount for Login and Register pages.
- Improve OTP input UX for mobile by using inputMode="numeric" and type="tel" and enforce 4-digit pattern; optionally prepare for multi-input auto-advance in future enhancement.
- Add password visibility toggle with aria-pressed and accessible label.
- Improve visible focus styles for keyboard users.
- Add responsive CSS breakpoints for .auth-container and .auth-card to be mobile-first (<=480px, 481–768px, >=769px).
- Add small Vitest + React Testing Library checks asserting presence of ARIA attributes, role="alert" on messages, and focus behavior.

5. Technical Changes

- Modify Login.jsx and Register.jsx:
  - Add refs for first inputs and useEffect to set focus on mount.
  - Add aria-label attributes (or ensure existing labels are linked via htmlFor) and aria-describedby for validation messages.
  - Wrap message paragraphs with role="alert" and aria-live attributes as needed.
  - Replace OTP input type/text -> type="tel" inputMode="numeric" pattern="[0-9]{4}" and update tests selectors if needed.
  - Add a password visibility toggle button alongside password inputs; update state to switch input type between password/text and add aria-pressed.
- Update index.css:
  - Add mobile-first breakpoint rules and visible focus outlines (e.g., :focus-visible).
  - Ensure .auth-card has padding adjustments and width rules for small screens.
- Update Login.test.jsx (Vitest RTL):
  - Add tests to assert:
    - inputs have accessible labels (getByLabelText)
    - messages use role="alert" when present (getByRole('alert'))
    - first input receives focus on mount (document.activeElement check or toHaveFocus matcher)
- Keep changes limited to frontend only; no backend/token changes in this story.

6. Implementation Steps (developer tasks)

1) Prepare branch
   - Branch already created: feature/KAN-133
2) CSS updates
   - Edit mern-jwt-auth/frontend/src/index.css to add mobile-first rules:
     - Base styles remain, add @media (max-width: 480px) and (max-width: 768px) rules to adjust .auth-card width, padding, font sizes, and .countdown placement.
     - Add :focus-visible outlines for inputs and buttons.
3) Login.jsx changes
   - Import useRef and set ref on email input; useEffect to focus on mount.
   - Ensure label htmlFor matches input id. Add aria-describedby prop for message elements.
   - Change OTP input to type="tel" and inputMode="numeric" (pattern already present).
   - Add password visibility toggle: a button next to password input with aria-pressed state and accessible name.
   - Set message paragraphs to <p role="alert" aria-live="assertive"> when message.text exists.
4) Register.jsx changes
   - Mirror focus-on-mount, aria attributes and password toggle for password fields. Ensure confirm password has aria attributes.
5) Dashboard.jsx minor accessibility tweaks
   - Ensure logout button has descriptive text and focusable styles and messages use role="alert" if error exists.
6) Tests
   - Update/add tests in Login.test.jsx to assert ARIA attributes, role="alert" on messages, and focus behavior. Keep tests minimal and deterministic.
7) Lint/format and run Vitest
   - Run frontend tests and adjust selectors if changed.
8) Commit changes and push branch
   - Commit only modified frontend files. Avoid unrelated files.
9) Create Draft PR
   - Link Jira story KAN-133, describe planned changes, impacted components, and testing scope.

7. Dependencies & Risks

Dependencies:
- None for backend; this story is frontend-only.
- Testing requires Vitest + RTL (already present in repo).

Risks:
- Changing input ids/labels may require test selector updates (handled in implementation).
- Visual regressions—keep CSS delta minimal and responsive-first.
- OTP multi-input not implemented in this story to keep scope manageable; only improve single-field mobile UX.

8. Test Impact & Definition of Done

Definition of Done:
- Code changes committed on branch feature/KAN-133.
- Unit tests added/updated (Vitest + React Testing Library):
  - assert presence of ARIA labels on email/password inputs
  - assert messages rendered use role="alert"
  - assert first input receives focus on Login and Register mount
- Manual verification on desktop and mobile viewports (<480px, 481–768px, >=769px) shows layout adapts and inputs are usable.
- PR created (Draft) referencing JIRA KAN-133 and including testing scope.

Files to review in PR:
- mern-jwt-auth/frontend/src/pages/Login.jsx
- mern-jwt-auth/frontend/src/pages/Register.jsx
- mern-jwt-auth/frontend/src/pages/Dashboard.jsx (small tweaks)
- mern-jwt-auth/frontend/src/index.css
- mern-jwt-auth/frontend/src/pages/Login.test.jsx (added assertions)

Notes:
- This story avoids backend/session/token changes (KAN-134 covers server-side hardening).
- Accessibility is improved with pragmatic, low-risk changes; follow-up stories may include OTP multi-input UX and full WCAG audit.

