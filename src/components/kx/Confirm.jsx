import React from "react";
import SaveState from "./SaveState";

// A small confirmation: the shared "saved" state (a check that draws itself, then
// the words). Kept as its own name because many screens use it.
export default function Confirm({ children, ...rest }) {
  return <SaveState state="saved" {...rest}>{children}</SaveState>;
}
