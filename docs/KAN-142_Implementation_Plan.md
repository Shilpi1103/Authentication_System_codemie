# KAN-142 Implementation Plan

Story Key: KAN-142
Title: UI-001: Improve OTP Login UX and Inline Form Feedback

1. Story Overview

This story enhances the OTP login user experience in the frontend Login flow. Changes include:
- Add explicit 'Resend OTP' button enabled when countdown reaches 0.
- Implement inline per-field validation messages for Email and OTP input fields.
- Improve focus management: focus OTP input when entering verify step; focus first invalid field on validation errors.
- Make countdown accessible by adding aria-live for screen readers.
- Update CSS for consistent visuals and accessible disabled states.

2. Business Objective

Improve OTP login UX, reduce friction and support tickets, and increase accessibility compliance for keyboard and screen-reader users.

3. Impacted Components

Frontend:
- mern-jwt-auth/frontend/src/pages/Login.jsx (primary)
- mern-jwt-auth/frontend/src/index.css and App.css (styling adjustments)
- mern-jwt-auth/frontend/src/pages/Login.test.jsx (tests to adjust/update)

Backend: No code changes required for this story.

4. Functional Changes

- Add a Resend OTP button that appears during otp-verify step and becomes enabled when countdown reaches 0.
- Show inline validation messages beside/under each input rather than only global message blocks.
- Autofocus management: when moving to otp-verify, focus the OTP input; when validation fails on submit, focus first invalid field.
- Provide accessible countdown using aria-live region that announces remaining time updates.
- Ensure disabled states (e.g., Resend button) are visually distinct and meet contrast requirements.

5. Technical Changes

- Update Login.jsx to:
  - Add new state for per-field errors (e.g., otpErrors, otpEmailError).
  - Add a Resend OTP button with disabled state tied to countdown > 0.
  - Add useRef hooks for email, otp input elements to manage focus.
  - Update effect that runs countdown to also set aria-live-friendly text and control the enablement of Resend.
  - Adjust existing message handling to show inline messages adjacent to inputs.
- Update CSS (index.css / App.css):
  - Add styles for .inline-error, .resend-button, .disabled states and accessible focus outlines.
- Update frontend tests Login.test.jsx and Playwright tests (tests/specs/otp.spec.ts) to reflect new UI elements and behavior.

6. Implementation Steps

1) Read and run existing frontend tests locally to ensure baseline passing.
2) Modify mern-jwt-auth/frontend/src/pages/Login.jsx:
   - Add refs: emailRef, otpEmailRef, otpValueRef.
   - Add per-field error state: errors = { otpEmail: '', otpValue: '' }.
   - Change existing global otpMessage usage: keep global messages for server-level errors, but display per-field inline messages for validation.
   - Implement Resend button:
     - Render next to countdown in otp-verify step: <button className="btn-secondary resend" disabled={countdown > 0}>Resend OTP</button>
     - On click, call sendOtp again, reset countdown, and keep focus on otp input.
   - Update useEffect countdown to set aria-live text region (e.g., <p aria-live="polite">Time remaining: {countdown}s</p>).
   - On step change to otp-verify, focus otpValueRef.current.
   - On form submit validation error, call focus() on first invalid ref.
3) Update CSS files:
   - Add .inline-error { color: #b91c1c; font-size: 0.85rem; margin-top: 4px; }
   - Add .resend-button and .btn-secondary styles; ensure :disabled state has clear visuals and reduced opacity plus accessible contrast.
4) Update unit tests (Login.test.jsx):
   - Add assertions for presence of Resend button after countdown reaches 0 and enabled state.
   - Update tests that check countdown to verify aria-live text is present.
   - Add tests for inline validation messages when input is invalid and focus behavior is correct (mock focus via refs or check document.activeElement).
5) Update Playwright test (tests/specs/otp.spec.ts):
   - Adjust to expect sendOtp button still visible and Resend button behavior where appropriate.
6) Run test suite and adjust as needed.

7. Dependencies & Risks

Dependencies:
- No backend contract changes required.
- Tests rely on mockAuthResponse helpers (existing tests already mock network behavior).
- Styling to follow existing conventions in index.css and App.css.

Risks:
- Minor test updates required; flakiness if timers and focus assertions not handled correctly.
- Accessibility announcements may cause noise in automated UI tests; consider toggling reduced motion or test-friendly flags.

8. Test Impact & Definition of Done

Test Impact:
- Update and expand unit tests (Login.test.jsx) and Playwright tests (tests/specs/otp.spec.ts) to cover new behaviors: Resend button enablement, inline validation messages, focus management, and aria-live countdown.

Definition of Done:
- Code changes implemented on feature/KAN-142 branch.
- New/updated tests pass locally and in CI.
- docs/KAN-142_Implementation_Plan.md committed to feature branch.
- Draft PR created referencing KAN-142.
- UX validated manually: Resend button appears and enables after countdown, inline messages show on invalid inputs, focus management behaves as specified, and countdown announced to screen readers.

Notes:
- Keep changes limited to frontend files listed above. No backend changes required for this story.
