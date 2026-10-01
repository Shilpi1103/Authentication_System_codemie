# Implementation Plan

## 1. Jira Story

**Story ID:** `KIN-31`

**Story Title:** `Dashboard loading state`

**Related Epic:** `KAN-30 – Improve Dashboard UX States & Actions`

**Related Gap:** `GAP-007`

**Related Requirement(s):** `REQ-007.1, NFR-007.B`


---


## 2. Business Objective

Provide a clear loading state on the Dashboard so users are not presented with a blank page while data (dashboard profile) is being fetched. Once the data has loaded, remove the loading indicator and render the dashboard content.


---


## 3. Current State

Based on repository evidence, the Dashboard page is rendered by `\ern-jgt-auth/frontend/src/pages/Dashboard.js`:

- It fetches the user profile on mount via `getProfile()` from `frontend/src/services/authService`.
- State tracking currently includes:
  - `user` (initially `null`)
  - `error` (empty string initially)
- When `user` is null and no error, it displays a text message: `Loading profile...`
- On fetch failure (e.g. expired token), it sets an error message and after 2 seconds clears localStorage and navigates to `/login`.

Guz / Gap: the current loading state is a single line text message rather than a visual component (spinner/skeleton) that prevents the page from appearing blank/instantly empty.


---


## 4. Proposed Solution

Introduce an explicit `isLoading` state in the Dashboard and render a visual loading indicator (spinner or skeleton) while `getProfile()` request is in-flight.

Key behavior change:

- On component mount:
  1) Set `isLoading` to `true`
  2) Request profile
  3) On success: set `user`, set `isLoading` = `false`; render dashboard
  4) On error: set `error`, set `isLoading` = `false`; render error and redirect logic as currently implemented
- While loading: render the loading component instead of leaving the dashboard body empty/sparse.
- When loading completes: remove the loading component and show the dashboard profile content.