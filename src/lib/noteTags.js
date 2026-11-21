// The note tags (the prototype's seven; the owner's own list is still open,
// D2). Shared by the Journal and the QR buyer page, and read by the server
// (api/_lib/buyer.ts), so this file imports nothing.
export const TAGS = ["harsh", "sharp", "rounder", "sweeter", "woodier", "fading", "ready"];
/** The QR buyer page's own tags: how a finished bottle wears (owner 2026-11-21). The Journal keeps TAGS. */
export const BUYER_TAGS = ["fresh", "sweet", "warm", "woody", "strong", "soft", "compliments"];
/** "How long does it last on you?" on the QR buyer page, in hours (0041). */
export const LASTS = ["under2", "h2to4", "h4to8", "h8to12", "over12"];
