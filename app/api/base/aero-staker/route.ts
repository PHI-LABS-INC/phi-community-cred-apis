import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Official Aerodrome VotingEscrow contract (same as locker since staking is done through veNFT)
const AERO_STAKING = "0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4";

async function hasStakedAero(address: Address): Promise<boolean> {
  try {
    // Check if address has staked AERO tokens at least once
    const hasInteracted = await hasContractInteraction(
      address,
      AERO_STAKING as Address,
      [], // Check all interactions
      1, // At least 1 stake
      8453 // Base chain
    );
    return hasInteracted;
  } catch (error) {
    console.error("Error verifying AERO stakes:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify AERO stakes: ${
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

    const mint_eligibility = await hasStakedAero(address as Address);
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
