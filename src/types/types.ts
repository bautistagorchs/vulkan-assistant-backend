export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  boxes: number;
  totalKg: number;
  unitPrice: number;
  subtotal: number;
  // Optionally, you can add order?: Order; and product?: Product; if you have those interfaces defined
}
