# Design Document: KAN-142

## Story Summary

**Story Key:** KAN-142  
**Title:** UI-001: Improve OTP Login UX and Inline Form Feedback  
**Category:** UI Enhancement  

**Objective:** Enhance the OTP login user experience by implementing explicit Resend OTP functionality, inline per-field validation messages, focus management improvements, and accessible countdown timer to reduce user friction and improve accessibility compliance.

**Business Impact:**
- Improves user success rates during OTP login
- Reduces support requests related to OTP confusion
- Increases WCAG 2.1 accessibility compliance
- Enhances overall user experience

---

## 1. High-Level Design (HLD)

### 1.1 Solution Overview

The solution enhances the existing OTP login flow in the React frontend (`mern-jwt-auth/frontend/src/pages/Login.jsx`) with four key improvements:

1. **Explicit Resend OTP Button:** Replace implicit countdown-based resend with explicit button control
2. **Inline Field Validation:** Display validation messages directly below form inputs
3. **Focus Management:** Auto-focus OTP input and first invalid field on errors
4. **Accessible Countdown:** Make countdown timer screen-reader accessible with ARIA

**Current Flow:**
```
Password Login Form → "Login with OTP" link → Email Entry → Send OTP → OTP Verify (with countdown)
```

**Enhanced Flow:**
```
Password Login Form → "Login with OTP" link → Email Entry (+ inline validation) 
  → Send OTP → OTP Verify (+ inline validation + focus management + aria-live countdown + Resend button)
```

### 1.2 Architecture Overview

**Component Architecture:**

```
Login.jsx (Main Component)
├── State Management
│   ├── Existing: formData, message, loading, otpStep, otpEmail, otpValue, countdown
│   ├── New: emailError, otpError, resendEnabled
│   └── useRef: otpInputRef, emailInputRef
├── Form Sections
│   ├── Password Login Form (unchanged)
│   ├── OTP Email Form (enhanced with inline validation + ref)
│   └── OTP Verify Form (enhanced with inline validation + ref + Resend button)
└── Style Dependencies
    ├── index.css (inline error styles, link-button, countdown)
    └── App.css (focus states, aria-live)
```

**Technology Stack:**
- React 18+ (hooks: useState, useEffect, useRef)
- React Router DOM (navigation)
- Vite (build tool)
- CSS3 (styling with CSS variables)

### 1.3 Component Interaction

```
User Action                Component Response              Backend API
-----------                ------------------              -----------
[Enter Email]       →      Validate email format
                           Show inline error if invalid
[Click Send OTP]    →      Clear inline error
                           Call sendOtp()              →   POST /auth/otp/send
                    ←      Receive 200 OK                  ← OTP sent email
                           setOtpStep('otp-verify')
                           Focus OTP input (useRef)
                           Start countdown
[Countdown=0]       →      Enable Resend button
[Click Resend]      →      Call sendOtp()              →   POST /auth/otp/send
                           Reset countdown to 60
                           Clear OTP input
[Enter OTP]         →      Validate 4-digit format
                           Show inline error if invalid
[Click Verify]      →      Clear inline error
                           Call verifyOtp()            →   POST /auth/otp/verify
                    ←      Receive 200 OK                  ← JWT token
                           Navigate to /dashboard
                    ←      Receive 401/error               ← Error message
                           Show inline error
                           Focus OTP input
```

---

## 2. Low-Level Design (LLD)

### 2.1 Impacted Modules

**Primary Module:**
- `mern-jwt-auth/frontend/src/pages/Login.jsx`

**Supporting Modules:**
- `mern-jwt-auth/frontend/src/index.css`
- `mern-jwt-auth/frontend/src/App.css`
- `mern-jwt-auth/frontend/src/pages/Login.test.jsx` (test updates)
- `tests/specs/otp.spec.ts` (e2e test updates)
- `tests/pages/LoginPage.ts` (Page Object Model updates)

### 2.2 File-Level Changes

#### **File: `mern-jwt-auth/frontend/src/pages/Login.jsx`**

**Changes Required:**

1. **New State Variables:**
```javascript
const [emailError, setEmailError] = useState('');
const [otpError, setOtpError] = useState('');
const [resendEnabled, setResendEnabled] = useState(false);
```

2. **New Refs for Focus Management:**
```javascript
const otpInputRef = useRef(null);
const emailInputRef = useRef(null);
```

3. **Enhanced Email Validation:**
```javascript
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required.';
  if (!emailRegex.test(email)) return 'Please enter a valid email address.';
  return '';
};
```

4. **Enhanced OTP Validation:**
```javascript
const validateOtp = (otp) => {
  if (!otp) return 'OTP is required.';
  if (!/^\d{4}$/.test(otp)) return 'OTP must be exactly 4 digits.';
  return '';
};
```

5. **Update `handleSendOtp` function:**
- Add inline validation before submission
- Clear previous inline errors on success
- Focus email input on error
- Set inline error message on failure

6. **Update `handleVerifyOtp` function:**
- Add inline validation before submission
- Clear previous inline errors on success
- Focus OTP input on error
- Set inline error message on failure

7. **Update countdown `useEffect`:**
- Enable Resend button when countdown reaches 0
- Add early return if not in 'otp-verify' step

8. **Add `handleResendOtp` function:**
```javascript
const handleResendOtp = async () => {
  setOtpLoading(true);
  setOtpError('');
  setOtpValue('');
  try {
    await sendOtp({ email: otpEmail });
    setCountdown(60);
    setResendEnabled(false);
    setOtpMessage({ text: 'OTP resent successfully!', type: 'success' });
  } catch (err) {
    const status = err.response?.status;
    setOtpError(otpErrorMessage(status, err.response?.data?.message));
  } finally {
    setOtpLoading(false);
  }
};
```

9. **JSX Updates:**

**OTP Email Form:**
```jsx
<form onSubmit={handleSendOtp} noValidate>
  <div className="form-group">
    <label htmlFor="otpEmail">Email</label>
    <input
      ref={emailInputRef}
      id="otpEmail"
      type="email"
      name="otpEmail"
      placeholder="Enter your email"
      value={otpEmail}
      onChange={(e) => {
        setOtpEmail(e.target.value);
        setEmailError('');
      }}
      aria-invalid={emailError ? 'true' : 'false'}
      aria-describedby={emailError ? 'email-error' : undefined}
    />
    {emailError && (
      <span id="email-error" className="inline-error" role="alert">
        {emailError}
      </span>
    )}
  </div>
  <button type="submit" className="btn-primary" disabled={otpLoading}>
    {otpLoading ? 'Sending...' : 'Send OTP'}
  </button>
</form>
```

**OTP Verify Form:**
```jsx
<form onSubmit={handleVerifyOtp} noValidate>
  <div className="form-group">
    <label htmlFor="otpValue">Enter OTP</label>
    <input
      ref={otpInputRef}
      id="otpValue"
      type="text"
      name="otpValue"
      inputMode="numeric"
      pattern="[0-9]{4}"
      placeholder="4-digit OTP"
      maxLength="4"
      value={otpValue}
      onChange={(e) => {
        setOtpValue(e.target.value);
        setOtpError('');
      }}
      aria-invalid={otpError ? 'true' : 'false'}
      aria-describedby={otpError ? 'otp-error' : 'countdown-timer'}
    />
    {otpError && (
      <span id="otp-error" className="inline-error" role="alert">
        {otpError}
      </span>
    )}
  </div>
  <div 
    id="countdown-timer" 
    className="countdown" 
    aria-live="polite" 
    aria-atomic="true"
  >
    Time remaining: {countdown}s
  </div>
  <button type="submit" className="btn-primary" disabled={otpLoading}>
    {otpLoading ? 'Verifying...' : 'Verify OTP'}
  </button>
  <button
    type="button"
    className="btn-resend"
    onClick={handleResendOtp}
    disabled={!resendEnabled || otpLoading}
  >
    Resend OTP
  </button>
</form>
```

10. **Focus Management:**
- Focus `otpInputRef.current` when `otpStep` becomes `'otp-verify'`
- Focus `emailInputRef.current` when email validation fails
- Focus `otpInputRef.current` when OTP validation fails

#### **File: `mern-jwt-auth/frontend/src/index.css`**

**New CSS Classes:**

```css
/* Inline error messages */
.inline-error {
  display: block;
  color: #b91c1c;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  font-weight: 500;
}

/* Countdown timer */
.countdown {
  text-align: center;
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background-color: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

/* Resend button */
.btn-resend {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.btn-resend:hover:not(:disabled) {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.btn-resend:disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
  border-color: #e5e7eb;
}

/* Link button for OTP toggle */
.link-button {
  background: none;
  border: none;
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.link-button:hover {
  text-decoration: underline;
}

/* ARIA invalid state */
input[aria-invalid="true"] {
  border-color: #f87171;
}

input[aria-invalid="true"]:focus {
  border-color: #ef4444;
  outline: 2px solid #fca5a5;
}
```

#### **File: `mern-jwt-auth/frontend/src/App.css`**

**Updates:**

```css
/* Accessible focus states */
.btn-primary:focus-visible,
.btn-resend:focus-visible,
.link-button:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}

/* ARIA live region - visually stable */
[aria-live] {
  position: relative;
}
```

#### **File: `mern-jwt-auth/frontend/src/pages/Login.test.jsx`**

**New Test Cases:**

```javascript
test('shows inline error when email is empty and send OTP clicked', async () => {
  renderLogin();
  fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
  });
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
});

test('shows inline error when OTP is empty and verify clicked', async () => {
  sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
  renderLogin();
  fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
  });
  expect(screen.getByText(/otp is required/i)).toBeInTheDocument();
});

test('Resend button disabled until countdown reaches 0', async () => {
  vi.useFakeTimers();
  sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
  renderLogin();
  fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
  });
  
  const resendButton = screen.getByRole('button', { name: /resend otp/i });
  expect(resendButton).toBeDisabled();
  
  await act(async () => {
    vi.advanceTimersByTime(60_000);
  });
  
  expect(resendButton).toBeEnabled();
});

test('Resend button calls sendOtp and resets countdown', async () => {
  vi.useFakeTimers();
  sendOtp.mockResolvedValue({ status: 200, data: {} });
  renderLogin();
  
  fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
  });
  
  await act(async () => {
    vi.advanceTimersByTime(60_000);
  });
  
  const resendButton = screen.getByRole('button', { name: /resend otp/i });
  await act(async () => {
    fireEvent.click(resendButton);
  });
  
  expect(sendOtp).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/Time remaining: 60s/)).toBeInTheDocument();
  expect(resendButton).toBeDisabled();
});

test('countdown has aria-live=polite for screen readers', async () => {
  sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
  renderLogin();
  
  fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
  });
  
  const countdown = screen.getByText(/Time remaining/);
  expect(countdown).toHaveAttribute('aria-live', 'polite');
  expect(countdown).toHaveAttribute('aria-atomic', 'true');
});
```

#### **File: `tests/specs/otp.spec.ts`**

**New E2E Test Cases:**

```typescript
test('Resend OTP button is disabled during countdown', async ({ page, loginPage }) => {
  await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
  await loginPage.requestOtp(testUser.email);
  
  const resendButton = page.getByRole('button', { name: /resend otp/i });
  await expect(resendButton).toBeDisabled();
});

test('Resend OTP button enabled after countdown and resends OTP', async ({ page, loginPage }) => {
  await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
  await loginPage.requestOtp(testUser.email);
  
  // Wait for countdown to reach 0
  await page.waitForTimeout(60000);
  
  const resendButton = page.getByRole('button', { name: /resend otp/i });
  await expect(resendButton).toBeEnabled();
  
  const resendRequest = page.waitForRequest(
    (request) => request.url().endsWith('/auth/otp/send') && request.method() === 'POST',
  );
  
  await resendButton.click();
  await resendRequest;
  await expect(page.getByText(/Time remaining: 60s/)).toBeVisible();
});

test('inline validation error displayed for invalid email', async ({ page, loginPage }) => {
  await loginPage.goto();
  await page.getByRole('button', { name: /login with otp/i }).click();
  await page.getByRole('button', { name: /send otp/i }).click();
  
  await expect(page.getByText(/email is required/i)).toBeVisible();
});

test('countdown has aria-live attribute', async ({ page, loginPage }) => {
  await mockAuthResponse(page, 'otp/send', { message: 'OTP sent successfully' });
  await loginPage.requestOtp(testUser.email);
  
  const countdown = page.locator('[aria-live="polite"]');
  await expect(countdown).toBeVisible();
  await expect(countdown).toContainText(/Time remaining/);
});
```

#### **File: `tests/pages/LoginPage.ts`**

**Updates to Page Object Model:**

```typescript
// Add new locators
readonly resendOtpButton: Locator;
readonly emailInlineError: Locator;
readonly otpInlineError: Locator;
readonly countdown: Locator;

constructor(page: Page) {
  // ... existing locators ...
  this.resendOtpButton = page.getByRole('button', { name: /resend otp/i });
  this.emailInlineError = page.locator('.inline-error#email-error');
  this.otpInlineError = page.locator('.inline-error#otp-error');
  this.countdown = page.locator('[aria-live="polite"]');
}

// Add new helper method
async resendOtp() {
  await this.resendOtpButton.click();
}
```

### 2.3 API Changes

**No backend API changes required.** All enhancements are frontend-only:
- Existing API endpoints remain unchanged:
  - `POST /api/auth/otp/send`
  - `POST /api/auth/otp/verify`
- API response structures remain unchanged
- API error codes remain unchanged

### 2.4 Database Changes

**No database changes required.** This is a pure UI enhancement.

---

## 3. Wireframes

### 3.1 OTP Email Entry Step (Enhanced)

**Before Enhancement:**
```
┌─────────────────────────────┐
│      Welcome Back           │
├─────────────────────────────┤
│ Email                       │
│ [_____________________]     │
│                             │
│ [ Send OTP ]                │
│                             │
│ < Back                      │
└─────────────────────────────┘
```

**After Enhancement:**
```
┌─────────────────────────────┐
│      Welcome Back           │
├─────────────────────────────┤
│ Email                       │
│ [_____________________]     │  ← aria-invalid when error
│ ⚠ Email is required         │  ← Inline error (red)
│                             │
│ [ Send OTP ]                │
│                             │
│ < Back                      │
└─────────────────────────────┘
```

### 3.2 OTP Verify Step (Enhanced)

**Before Enhancement:**
```
┌─────────────────────────────┐
│      Welcome Back           │
├─────────────────────────────┤
│ Enter OTP                   │
│ [____]                      │
│                             │
│ Time remaining: 45s         │
│                             │
│ [ Verify OTP ]              │
│                             │
│ < Back                      │
└─────────────────────────────┘
```

**After Enhancement:**
```
┌─────────────────────────────┐
│      Welcome Back           │
├─────────────────────────────┤
│ Enter OTP                   │
│ [____]                      │  ← Auto-focused on entry
│ ⚠ OTP must be 4 digits     │  ← Inline error (red)
│                             │
│ ╔═══════════════════════╗   │  
│ ║ Time remaining: 45s   ║   │  ← aria-live="polite"
│ ╚═══════════════════════╝   │     (bordered box)
│                             │
│ [ Verify OTP ]              │
│                             │
│ [ Resend OTP ]              │  ← Disabled until countdown=0
│   (disabled)                │
│                             │
│ < Back                      │
└─────────────────────────────┘
```

**Countdown at 0:**
```
┌─────────────────────────────┐
│      Welcome Back           │
├─────────────────────────────┤
│ Enter OTP                   │
│ [____]                      │
│                             │
│ ╔═══════════════════════╗   │
│ ║ Time remaining: 0s    ║   │
│ ╚═══════════════════════╝   │
│                             │
│ [ Verify OTP ]              │
│                             │
│ [ Resend OTP ]              │  ← Now enabled
│   (enabled - hover effect)  │
│                             │
│ < Back                      │
└─────────────────────────────┘
```

### 3.3 Focus States

**Focus Indicators (WCAG 2.1 AA compliant):**
- Input fields: 2px solid #4f46e5 outline with 2px offset
- Buttons: 2px solid #4f46e5 outline with 2px offset
- Link buttons: 2px solid #4f46e5 outline with 2px offset
- Invalid inputs: red border (#f87171) with red outline (#fca5a5) on focus

---

## 4. Assumptions & Dependencies

### 4.1 Assumptions

1. **Countdown Logic:** The existing 60-second countdown is accurate and synchronized with backend OTP TTL
2. **Email Validation:** Client-side email regex validation (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) is sufficient for UX; server validates definitively
3. **OTP Format:** 4-digit numeric OTP format will not change
4. **Browser Support:** Modern browsers with React 18+ support (ES6+, CSS Grid, Flexbox)
5. **Screen Readers:** Users with screen readers will benefit from aria-live announcements
6. **No Concurrent Sessions:** User completes one OTP flow at a time (no multi-tab OTP entry)
7. **Rate Limiting:** Backend rate limiting (existing) prevents Resend OTP abuse
8. **Test Coverage:** Existing test infrastructure (Vitest + Playwright) supports new test cases

### 4.2 Dependencies

**External Dependencies:**
- `react` (^18.3.1) - Core framework
- `react-router-dom` (^6.28.1) - Navigation
- `axios` (via authService.js) - API calls
- `vite` (^6.0.7) - Build tool

**Internal Dependencies:**
- `mern-jwt-auth/frontend/src/services/authService.js` - sendOtp(), verifyOtp() functions (unchanged)
- `mern-jwt-auth/backend/controllers/otpController.js` - Backend OTP logic (unchanged)
- `mern-jwt-auth/backend/middleware/otpRateLimiter.js` - Rate limiting (unchanged)

**Test Dependencies:**
- `@testing-library/react` (^16.1.0) - Component tests
- `vitest` (^3.0.8) - Unit test runner
- `@playwright/test` (^1.64.1) - E2E tests

### 4.3 Known Constraints

1. **Countdown Precision:** 1-second interval (not millisecond-precise)
2. **Resend Throttling:** Resend button relies on client-side countdown; backend rate limiter provides security boundary
3. **Focus Trap:** No focus trap implemented (user can tab away from form)
4. **Mobile Keyboard:** `inputMode="numeric"` triggers numeric keyboard on mobile but doesn't prevent non-numeric input (pattern validation handles this)
5. **Screen Reader Announcements:** `aria-live="polite"` may not announce every second (by design, to avoid spam); announces when focused or on significant changes
6. **CSS Variables:** Assumes CSS variables (--accent, --border) are defined in root or App.css (existing)
7. **No Offline Support:** Requires network connectivity for API calls
8. **No Multi-Language:** All text is English; no i18n support in this story

### 4.4 Migration/Rollback Strategy

**Forward Compatibility:**
- All changes are additive (no breaking changes to existing functionality)
- Existing password login flow unchanged
- Existing OTP backend logic unchanged

**Rollback Plan:**
If issues arise post-deployment:
1. Revert `Login.jsx`, `index.css`, `App.css` to previous commit
2. Revert test files to previous commit
3. Clear browser cache (CSS changes)
4. No database migration needed (pure UI)

**Verification Post-Deployment:**
1. Run Playwright E2E tests: `npm run test:e2e`
2. Run Vitest unit tests: `npm --prefix mern-jwt-auth/frontend test`
3. Manual accessibility audit: WAVE tool, screen reader (NVDA/JAWS)
4. Cross-browser testing: Chrome, Firefox, Safari, Edge
5. Mobile testing: iOS Safari, Android Chrome
6. Monitor error logs for focus/ref issues

---

## 5. Design Sign-Off

**Design Document Version:** 1.0  
**Created Date:** 2025-01-XX  
**Story Key:** KAN-142  
**Branch:** feature/KAN-142  
**PR:** https://github.com/Shilpi1103/Authentication_System_codemie/pull/6  

**References:**
- Implementation Plan: `docs/KAN-142_Implementation_Plan.md`
- Jira Story: https://epam-team-jeqo55h5.atlassian.net/browse/KAN-142
- Gap Analysis: Confluence - Application Gap Analysis - Authentication_System_codemie

**Review Status:** PENDING_REVIEW  
**Next Step:** Await Human Approval → Proceed to Development

---

**End of Design Document**