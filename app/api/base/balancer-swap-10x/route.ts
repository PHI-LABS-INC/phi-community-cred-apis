import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

const BALANCER_ROUTER = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
const SWAP_METHOD = "0x945bcec9";

async function hasTenBalancerSwaps(address: Address): Promise<boolean> {
  try {
    // Check if address has at least 10 interactions with Balancer router using swap method
    const hasInteracted = await hasContractInteraction(
      address,
      BALANCER_ROUTER as Address,
      [SWAP_METHOD], // Specific swap method
      10, // At least 10 interactions
      8453 // Base chain
    );
    return hasInteracted;
  } catch (error) {
    console.error("Error verifying Balancer swaps (10x):", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Balancer swaps: ${
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
    const mint_eligibility = await hasTenBalancerSwaps(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });
    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing GET request (10x):", {
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
