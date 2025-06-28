import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

async function verifyTransactionCount(address: Address): Promise<boolean> {
  try {
    const txCount = await client.getTransactionCount({ address });
    return txCount >= 100;
  } catch (error) {
    console.error("Error verifying transaction count:", {
      error,
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

    const result = await verifyMultipleWalletsSimple(
      req,
      verifyTransactionCount
    );
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: result.mint_eligibility, signature }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
