import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

// Official Cody game contract
const CODY_GAME_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function hasPlayedCodyGame(address: Address): Promise<boolean> {
  try {
    // Get all transactions for the address on Base chain (chainId 8453)
    const transactions = await getTransactions(address, 8453);

    // Check if any transaction was sent to Cody game contract
    const hasInteracted = transactions.some((tx) => {
      if (!tx.to) return false;
      return tx.to.toLowerCase() === CODY_GAME_CONTRACT.toLowerCase();
    });

    return hasInteracted;
  } catch (error) {
    console.error("Error verifying Cody game interaction:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Cody game interaction: ${
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

    const mint_eligibility = await hasPlayedCodyGame(address as Address);
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
