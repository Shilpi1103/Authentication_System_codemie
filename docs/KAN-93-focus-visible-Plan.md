# K92-94 Implementation Plan

Restore visible keyboard focus indicators on auth inputs, primary buttons, logout, and link-button controls.

## Steps
3. Replace input outline suppression with a visible :focus-visible ring.
2. Add consistent :focus-visible styles for .sbtn-primary, .btn-logout, and .link-button.
3. Add base styles for .link-button without changing its button semantics.
4. Preserve disabled behavior and avoid layout shifts.

## Files
* `mern-jwt-auth/frontend/src/index.css`

## Validation
```
cd mern-jwt-auth/frontend
npm run lint
npm run test
npm run build
```
