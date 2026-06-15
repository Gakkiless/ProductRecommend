export type TabKey = "home" | "customer" | "products" | "quote" | "mine";

export type Product = {
  id: string;
  name: string;
  duration: string;
  audience: string[];
  productTags: string[];
  priceRange: string;
  hotels: string;
  vehicle: string;
  activities: string[];
  altitudeRisk: string;
  score: number;
  notFor: string[];
  route: string;
  reason: string;
  imageUrl: string;
};

export type ProfileField = {
  label: string;
  value: string;
};

export type ProfileChecklist = {
  identity: ProfileField[];
  household: ProfileField[];
  consumption: ProfileField[];
  onlineBehavior: ProfileField[];
  interactionRisk: ProfileField[];
  residence: ProfileField[];
};

export type Customer = {
  id: string;
  name: string;
  memberLevel: string;
  memberCardNo: string;
  memberPhone: string;
  city: string;
  family: string;
  gmv: string;
  lastTrip: string;
  lastMaintenanceAt: string;
  status: string;
  tags: string[];
  profileChecklist: ProfileChecklist;
  summary: string;
  orders: Array<{ year: string; tripDate: string; product: string; amount: string; feedback: string }>;
};

export type RouterResult = {
  intent: string;
  subIntent: string;
  entities: Record<string, string | number | boolean | string[]>;
  response: string;
  workflowSteps: string[];
  cards: Array<Record<string, unknown>>;
};
