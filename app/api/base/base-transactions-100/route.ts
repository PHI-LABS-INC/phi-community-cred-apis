import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

// Create Base client
const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

async function verifyTransactionCount(address: Address): Promise<boolean> {
  try {
    const transactionCount = await baseClient.getTransactionCount({ address });
    return transactionCount >= 100;
  } catch (error) {
    console.warn(
      "Viem getTransactionCount failed, trying smart wallet approach:",
      {
        error,
        address,
      }
    );

    try {
      const transactions = await getTransactions(address, 8453); // Base chain
      return transactions.length >= 100;
    } catch (fallbackError) {
      console.error("Both viem and smart wallet approaches failed:", {
        viemError: error,
        fallbackError,
        address,
        timestamp: new Date().toISOString(),
      });
      throw new Error(
        `Failed to verify transaction count: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

    const mint_eligibility = await verifyTransactionCount(address as Address);
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
