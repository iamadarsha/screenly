/**
 * Sign-in / cloud-account features are temporarily disabled build-wide (operator
 * decision, 2026-09-29) while the account backend isn't ready for the public
 * launch. Every "Sign in" trigger in the app should render disabled (greyed
 * out, not hidden - hiding it would look like a missing feature rather than a
 * deliberately paused one) and show SIGN_IN_DISABLED_REASON as its tooltip,
 * rather than opening the sign-in dialog.
 *
 * To re-enable: flip this back to `true`. Nothing else needs to change - every
 * call site reads this flag rather than hardcoding its own disabled state.
 */
export const SIGN_IN_ENABLED = false;

export const SIGN_IN_DISABLED_REASON = "Sign-in is coming soon";
