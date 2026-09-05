import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log("Razorpay Key ID:", keyId);
console.log(
  "Razorpay Secret Loaded:",
  keySecret ? "YES" : "NO"
);

if (!keyId || !keySecret) {
  throw new Error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined"
  );
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export async function createRazorpayOrder(params: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}) {
  const order = await razorpay.orders.create({
    amount: params.amount,
    currency: params.currency ?? "INR",
    ...(params.receipt !== undefined && { receipt: params.receipt }),
    ...(params.notes !== undefined && { notes: params.notes }),
  });

  return order;
}

export async function fetchRazorpayPayment(paymentId: string) {
  return razorpay.payments.fetch(paymentId);
}

export default razorpay;