import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Hyperliquid USDC Depositor contract address on Base
const HYPERLIQUID_USDC_DEPOSITOR = "0x734F2FeC11f3a2B822a49E91f67BDc85638F97Ec";

async function hasDepositedToHyperliquid(address: Address): Promise<boolean> {
  try {
    // Use hasContractInteraction to check for at least one interaction with the Hyperliquid Depositor contract
    return await hasContractInteraction(
      address,
      HYPERLIQUID_USDC_DEPOSITOR as Address,
      [],
      1,
      8453
    );
  } catch (error) {
    console.error("Error verifying Hyperliquid USDC deposit:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Hyperliquid USDC deposit: ${
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
    const mint_eligibility = await hasDepositedToHyperliquid(
      address as Address
    );
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
