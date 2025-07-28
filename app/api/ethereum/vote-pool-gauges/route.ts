import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Ethereum mainnet Pool Gauges contract
const POOL_GAUGES_CONTRACT =
  "0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD" as Address;
const VOTE_METHOD = ["0x2e4e99a1", "0xd7136328"];

async function hasVotedOnPoolGauges(address: Address): Promise<boolean> {
  try {
    return await hasContractInteraction(
      address,
      POOL_GAUGES_CONTRACT,
      VOTE_METHOD, // Specific method IDs for voting
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying pool gauge vote:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify pool gauge vote: ${
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
    const mint_eligibility = await hasVotedOnPoolGauges(address as Address);
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
