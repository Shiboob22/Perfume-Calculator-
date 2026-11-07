import React from "react";
import { Routes, Route } from "react-router-dom";
import ShopPage from "./ShopPage";
import Checkout from "./Checkout";
import Thanks from "./Thanks";
import NotFound from "../NotFound";

// /shop, /shop/checkout, /shop/thanks (and the same under /ar). Public: no
// sign-in, no Supabase; everything goes through /api/shop.
export default function ShopRoutes() {
  return (
    <Routes>
      <Route index element={<ShopPage />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="thanks" element={<Thanks />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
