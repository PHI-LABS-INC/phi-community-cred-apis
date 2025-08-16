import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Gamma Vault contract for rETH/WETH pool
const GAMMA_RETH_WETH_VAULT =
  "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8" as Address;

// Method ID for deposit function
const DEPOSIT_METHOD_ID = "0x6e553f65";

async function hasGammaRethWethPosition(address: Address): Promise<boolean> {
  try {
    return await hasContractInteraction(
      address,
      GAMMA_RETH_WETH_VAULT,
      [DEPOSIT_METHOD_ID],
      1,
      1
    );
  } catch (error) {
    console.error("Error verifying Gamma rETH/WETH position:", error);
    throw new Error("Failed to verify Gamma rETH/WETH position");
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid address provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const mint_eligibility = await hasGammaRethWethPosition(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
