export type CardInfo = {
  id: number;
  name: string;
  type: string;
  frameType: string;
  imageUrl: string;
  hasLocalImage: boolean;
};

export type PriceData = {
  sellerId: number;
  price: number | null;
  previousPrice: number | null;
  previousUpdatedAt: string | null;
  updatedAt: string;
};

export type WatchlistEntry = {
  id: number;
  format: "TCG" | "OCG";
  deck: string;
  status: string;
  notes: string;
  cardId: number;
  quantity: number;
  setName: string | null;
  rarity: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  card: CardInfo;
  prices: PriceData[];
};

export type Seller = {
  id: number;
  name: string;
  platform: string;
  shippingProfile: string;
  createdAt: string;
};

export type RarityOption = {
  rarity: string;
  code: string;
};
