// Where the Shop's payments go. The InstaPay link and handle are public (the
// buyer needs them); the owner's order email lives only on the server
// (SHOP_ORDER_EMAIL, api/shop.ts).
export const SHOP = {
  currency: "EGP",
  instapay: {
    handle: "shibooob@instapay",
    link: "https://ipn.eg/S/shibooob/instapay/2KeNDA",
  },
};
