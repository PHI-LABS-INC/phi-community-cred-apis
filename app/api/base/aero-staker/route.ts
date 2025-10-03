import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Aerodrome Gauge Factory contract
const GAUGE_FACTORY = "0x4E2b77f04b8F5a8Ed539a5B61E632E7EF6102592";

// Stake method ID for Aerodrome gauges
const STAKE_METHOD_ID = "0xa694fc3a"; // stake(uint256)

async function hasStakedLiquidity(address: Address): Promise<boolean> {
  try {
    // Check if address has staked liquidity in any Aerodrome gauge
    const hasInteracted = await hasContractInteraction(
      address,
      GAUGE_FACTORY as Address,
      [STAKE_METHOD_ID], // Check for stake method calls
      1, // At least 1 stake
      8453 // Base chain
    );
    return hasInteracted;
  } catch (error) {
    console.error("Error verifying Aerodrome liquidity stakes:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Aerodrome liquidity stakes: ${
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

    const mint_eligibility = await hasStakedLiquidity(address as Address);
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
