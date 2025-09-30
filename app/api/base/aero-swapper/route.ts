import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

// Official Aerodrome Router contract
const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";

async function hasCompletedAeroSwaps(address: Address): Promise<boolean> {
  try {
    // Get all transactions for the address on Base chain
    const transactions = await getTransactions(address, 8453);

    // Filter transactions for router contract interactions
    const routerTxs = transactions.filter((tx) => {
      if (!tx.to) return false;
      return tx.to.toLowerCase() === AERODROME_ROUTER.toLowerCase();
    });

    console.log("Found Aerodrome router transactions:", routerTxs.length);
    return routerTxs.length >= 1; // At least 1 swap
  } catch (error) {
    console.error("Error verifying Aerodrome swaps:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Aerodrome swaps: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const mint_eligibility = await hasCompletedAeroSwaps(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
