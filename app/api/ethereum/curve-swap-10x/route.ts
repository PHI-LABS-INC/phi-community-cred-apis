import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Ethereum CurveRouter v1.2 contract address
const CURVE_ROUTER_V1_2_ETH =
  "0x45312ea0eff7e09c83cbe249fa1d7598c4c8cd4e" as Address;

// Base CurveRouter contract address
const CURVE_ROUTER_V1_2_BASE =
  "0x4f37A9d177470499A2dD084621020b023fcffc1F" as Address;

async function hasUsedCurveSwap10x(address: Address): Promise<boolean> {
  try {
    // Check Ethereum mainnet
    const ethResult = await hasContractInteraction(
      address,
      CURVE_ROUTER_V1_2_ETH,
      [], // No specific method IDs required
      10, // At least 10 interactions
      1 // Ethereum mainnet
    );

    if (ethResult) return true;

    // Check Base chain
    const baseResult = await hasContractInteraction(
      address,
      CURVE_ROUTER_V1_2_BASE,
      [], // No specific method IDs required
      10, // At least 10 interactions
      8453 // Base chain
    );

    return baseResult;
  } catch (error) {
    console.error("Error verifying Curve swap 10x:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Curve swap 10x: ${
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

    const mint_eligibility = await hasUsedCurveSwap10x(address as Address);
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
