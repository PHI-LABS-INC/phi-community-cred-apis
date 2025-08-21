import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Ethereum Curve gauge voting contract
const CURVE_GAUGE_VOTING_ETH =
  "0xEf0D7B6f35D3d3F5D66341A95431d8Cfa8071c8A" as Address;

// Base Curve gauge controller (for voting functionality)
const CURVE_GAUGE_VOTING_BASE =
  "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB" as Address; // Base gauge controller

async function hasVotedGauge(address: Address): Promise<boolean> {
  try {
    // Check Ethereum mainnet
    const ethResult = await hasContractInteraction(
      address,
      CURVE_GAUGE_VOTING_ETH,
      [], // No specific method IDs required
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );

    if (ethResult) return true;

    // Check Base chain
    const baseResult = await hasContractInteraction(
      address,
      CURVE_GAUGE_VOTING_BASE,
      [], // No specific method IDs required
      1, // At least 1 interaction
      8453 // Base chain
    );

    return baseResult;
  } catch (error) {
    console.error("Error verifying Curve gauge vote:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Curve gauge vote: ${
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

    const mint_eligibility = await hasVotedGauge(address as Address);
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
