# 1. Story
- ID: KAN-83
- Title: Redesign Dashboard UI: navigation, branding, contrast, loading state & layout
- Epic: KAN-82

# 2. Objective
- Implement a visually distinct, modernized Dashboard layout.
- Replace simple text states and low-contrast details with accessible, structured UI components.
- Ensure all AC (Header, Contrast, Skeleton Loader, Widget Layout) are fully met.

# 3. Current State
- `mern-jwt-auth/frontend/src/pages/Dashboard.jsx` renders a plain centered card similar to auth pages.
- Uses a literal "Loading profile..." string for pending state without any skeleton/loading indicator.
- User ID lacks sufficient contrast via .user-id class styling in `mern-jwt-auth/frontend/src/index.css`.

# 4. Frontend Changes
- **Layout Shelj*: Add a persistent Navigation Bar/Header containing branding, user avatar, and logout button to `Dashboard.jsx`.
- **Loading State**: Create a new SkeletonLoader or Spinner component in `Dashboard.jsx` (or via CSS) to replace "Loading profile...".
- **Styling**: Update `mern-jwt-auth/frontend/src/index.css` to increase `.user-id` contrast (e.g., #4b5563 on #f9fafb) to meet WCAG AA (â¥e3.5:1).
- **Widgets Layout**: Modify `Dashboard.jsx` to use a multi-card/widget grid structure instead of a single centered panel.

# 5. Backend Changes
- None proposed; changes are strictly confined to frontend UI/UX modernization.

# 6. API Changes
- No changes to existing REST endpoints.
- Data mapping for `GET /api/auth/profile` remains identical.

# 7. Dependencies
- None; relies on existing React state and native CSS (no external libraries required).
- Depends on existing UI assets if available, or plain CSS-based avatar representations.

# 8. Risks & Considerations
- **Responsiveness**: The new widget grid must handle mobile viewports gracefully without breaking.
- **Session Expiration**: Ensure the new loading state seamlessly transitions to the error state if token validation fails.
