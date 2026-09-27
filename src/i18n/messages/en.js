// English UI strings. Every key here needs a match in ar.js.
export default {
  brand: "The Scent Handbook",
  language: { switchTo: "العربية", switchLabel: "Switch to Arabic" },
  app: {
    loading: "Loading…",
    signOut: "Sign out",
    tabs: {
      search: "Search",
      calculator: "Calculator",
      batches: "Batches",
      inventory: "Inventory",
      ask: "Ask",
    },
  },
  calculator: {
    log: {
      untracked: "This oil isn't in your inventory, so no stock was deducted.",
      stockFailed: "Your batch is saved, but the inventory couldn't be updated: {error}",
    },
  },
  auth: {
    loading: "Loading The Scent Handbook…",
    signIn: "Sign in",
    checkInbox: "Check your inbox",
    sentLinkTo: "We sent a magic sign-in link to",
    useDifferent: "Use a different email or method",
    continueGoogle: "Continue with Google",
    continueApple: "Continue with Apple",
    orMagicLink: "or magic link",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    sendLink: "Send magic link",
    sendingLink: "Sending link…",
    sendFailed: "Failed to send magic link.",
    oauthFailed: "Failed to sign in with {provider}.",
  },
};
