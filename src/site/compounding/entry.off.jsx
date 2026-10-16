import React, { lazy, Suspense } from "react";

const Scene = lazy(() => import("./Hero"));

export default function LazyCompounding() {
  return <Suspense fallback={null}><Scene /></Suspense>;
}
