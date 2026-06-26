import { NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[mpesa-callback] Received payload:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    if (!checkoutRequestID) {
      return NextResponse.json({ error: "Missing CheckoutRequestID" }, { status: 400 });
    }

    let status: "completed" | "failed" = "failed";
    let mpesaReceiptNumber: string | undefined = undefined;
    let error: string | undefined = undefined;

    if (resultCode === 0) {
      status = "completed";
      const metadataItems = stkCallback.CallbackMetadata?.Item || [];
      const receiptItem = metadataItems.find((item: any) => item.Name === "MpesaReceiptNumber");
      mpesaReceiptNumber = receiptItem?.Value ? String(receiptItem.Value) : undefined;
    } else {
      status = "failed";
      error = resultDesc || `Transaction failed with code ${resultCode}`;
    }

    // Call Convex public mutation to update transaction status and provision subscription
    await fetchMutation(api.mpesa.updateMpesaTransactionStatus, {
      checkoutRequestID,
      status,
      mpesaReceiptNumber,
      error,
    });

    return NextResponse.json({ ResponseCode: "0", ResponseDescription: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[mpesa-callback] Error processing webhook:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
