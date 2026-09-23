export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  tenantId: string;
  tenantName: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}

export type CustomerStage = 'LEAD' | 'PROSPECT' | 'CUSTOMER';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  price: string;
  cost: string;
  tax_rate: string;
  stock: number;
  min_stock: number;
  low_stock: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  document_number: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  stage: CustomerStage;
  notes: string | null;
  credit_limit: number;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
}

export interface Sale {
  id: string;
  number: string;
  status: string;
  customer_id: string | null;
  customer_name: string | null;
  payment_method: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string | null;
  sold_by: string | null;
  voided_at: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface DashboardSummary {
  sales_count: number;
  revenue: number;
  tax: number;
  avg_ticket: number;
  units_sold: number;
  customers_count: number;
  today: { revenue: number; sales_count: number };
}

export interface SalesByDay {
  date: string;
  revenue: number;
  sales_count: number;
}

export interface TopProduct {
  product_name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentMethodRow {
  payment_method: string;
  revenue: number;
  sales_count: number;
}

export interface RecentSale {
  sale_id: string;
  number: string;
  customer_name: string | null;
  total: number;
  status: string;
  payment_method: string;
  sold_at: string | null;
}

export interface RotationRow {
  product_name: string;
  quantity_7d: number;
}

export interface CustomerStats {
  total: number;
  by_stage: Record<string, number>;
  created_last_7_days: number;
  total_credit_limit: number;
}

/**
 * Vista compuesta del tablero que entrega el API Gateway.
 *
 * La PWA hace una sola peticion en lugar de siete: el gateway consulta los
 * servicios en paralelo dentro de la red privada. Si alguna vista falla, llega
 * en `unavailable` y el resto del tablero se muestra igual.
 */
export interface DashboardOverview {
  summary: DashboardSummary;
  sales_by_day: SalesByDay[];
  top_products: TopProduct[];
  payment_methods: PaymentMethodRow[];
  recent_sales: RecentSale[];
  rotation: RotationRow[];
  customers: CustomerStats;
}

export interface OverviewResponse {
  data: Partial<DashboardOverview>;
  unavailable?: string[];
}

export interface ApiList<T> {
  data: T[];
  total: number;
}

export interface ApiItem<T> {
  data: T;
}

export interface NewSaleItem {
  product_id: string;
  quantity: number;
}

export interface NewSalePayload {
  items: NewSaleItem[];
  customer_id?: string;
  customer_name?: string;
  payment_method: string;
  notes?: string;
}

export interface PendingSale {
  id: string;
  payload: NewSalePayload;
  createdAt: string;
  label: string;
}
