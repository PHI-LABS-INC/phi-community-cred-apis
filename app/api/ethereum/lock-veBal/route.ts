import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

const VE_BAL_LOCK_CONTRACT =
  "0xC128a9954e6c874eA3d62ce62B468bA073093F25" as Address;
const LOCK_METHOD = "0x65fc3873";

async function hasLockedVeBal(address: Address): Promise<boolean> {
  try {
    return await hasContractInteraction(
      address,
      VE_BAL_LOCK_CONTRACT,
      [LOCK_METHOD], // Specific method ID for locking veBAL
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying veBAL lock:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify veBAL lock: ${
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
    const mint_eligibility = await hasLockedVeBal(address as Address);
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
