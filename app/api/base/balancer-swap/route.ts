import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

const BALANCER_ROUTER_ADDRESSES = [
  "0x3f170631ed9821ca51a59d996ab095162438dc10",
  "0x85a80afee867adf27b50bdb7b76da70f1e853062",
] as const;

async function hasBalancedSwapped(address: Address): Promise<boolean> {
  try {
    // Check if address has interacted with any of the Balancer router addresses
    for (const routerAddress of BALANCER_ROUTER_ADDRESSES) {
      const hasInteracted = await hasContractInteraction(
        address,
        routerAddress as Address,
        [], // No specific method required
        1, // At least 1 interaction
        8453 // Base chain
      );
      if (hasInteracted) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error verifying Balancer swap:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Balancer swap: ${
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

    const mint_eligibility = await hasBalancedSwapped(address as Address);
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
