export interface FloorProduct {
  id: string;
  name: string;
  category: "parkett" | "vinyl" | "laminat" | "kork";
  detail: string;
  price: string;
  texture_url: string;
  shop_url: string;
}
