import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Ethereum Curve lock contract
const LOCK_CONTRACT_ETH =
  "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2" as Address;
const LOCK_METHOD = "0x65fc3873";

// Base Curve gauge factory (for veCRV-like functionality)
const LOCK_CONTRACT_BASE =
  "0xabc000d88f23bb45525e447528dbf656a9d55bf5" as Address; // Base gauge factory

async function hasLockedCrv(address: Address): Promise<boolean> {
  try {
    // Check Ethereum mainnet
    const ethResult = await hasContractInteraction(
      address,
      LOCK_CONTRACT_ETH,
      [LOCK_METHOD], // Specific method ID for locking CRV
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );

    if (ethResult) return true;

    // Check Base chain
    const baseResult = await hasContractInteraction(
      address,
      LOCK_CONTRACT_BASE,
      [LOCK_METHOD], // Specific method ID for locking CRV
      1, // At least 1 interaction
      8453 // Base chain
    );

    return baseResult;
  } catch (error) {
    console.error("Error verifying Curve lock:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Curve lock: ${
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

    const mint_eligibility = await hasLockedCrv(address as Address);
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
