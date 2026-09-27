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
  plan: {
    pro: "Pro",
    names: { free: "Free", pro: "Pro" },
    earlyAccess: "Pro is in early access and not on sale yet.",
    locked: {
      ai: { ask: "Ask is part of Pro." },
      inventory: "Inventory is part of Pro.",
    },
    usage: "{used} of {cap} batches",
    batchCap: "Your {plan} plan keeps up to {cap} batches. Nothing is deleted; logging more needs Pro.",
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
