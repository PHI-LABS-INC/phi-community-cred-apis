import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Lighter Depositor contract address on Ethereum
const LIGHTER_DEPOSITOR = "0x3B4D794a66304F130a4Db8F2551B0070dfCf5ca7";

async function hasDepositedToLighter(address: Address): Promise<boolean> {
  try {
    // Use hasContractInteraction to check for at least one interaction with the Lighter Depositor contract
    return await hasContractInteraction(
      address,
      LIGHTER_DEPOSITOR as Address,
      [],
      1,
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying Lighter deposit:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Lighter deposit: ${
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
    const mint_eligibility = await hasDepositedToLighter(address as Address);
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
