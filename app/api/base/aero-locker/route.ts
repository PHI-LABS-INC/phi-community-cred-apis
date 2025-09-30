import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Official Aerodrome VotingEscrow contract
const AERO_LOCKER = "0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4";
const LOCK_METHOD_ID = "0xb52c05fe"; // createLock(uint256 _value,uint256 _lockDuration)

async function hasLockedAero(address: Address): Promise<boolean> {
  try {
    // Check if address has locked AERO tokens at least once
    const hasInteracted = await hasContractInteraction(
      address,
      AERO_LOCKER as Address,
      [LOCK_METHOD_ID], // Lock method
      1, // At least 1 lock
      8453 // Base chain
    );
    return hasInteracted;
  } catch (error) {
    console.error("Error verifying AERO locks:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify AERO locks: ${
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

    const mint_eligibility = await hasLockedAero(address as Address);
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
