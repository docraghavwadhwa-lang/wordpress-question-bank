import { z } from "zod";

export const CASHFREE_ENVIRONMENT = "live" as const;
export const cashfreeOrderSchema = z.object({
  order_id: z.string(), order_status: z.string(), order_amount: z.number(),
  order_currency: z.string(), payment_session_id: z.string().optional(),
  customer_details: z.object({ customer_id: z.string() }),
});
export type CashfreeOrder = z.infer<typeof cashfreeOrderSchema>;
export function cashfreePaymentMatches(order: CashfreeOrder, expected: { orderId: string; userId: string; paise: number }) {
  return order.order_status === "PAID" && order.order_id === expected.orderId &&
    order.customer_details.customer_id === expected.userId && order.order_currency === "INR" &&
    Number.isSafeInteger(expected.paise) && Math.round(order.order_amount * 100) === expected.paise;
}
export function cashfreeCheckoutMode(environment: "sandbox" | "live") {
  return environment === "live" ? "production" : "sandbox";
}