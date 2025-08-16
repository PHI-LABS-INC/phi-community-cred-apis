import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Liquity Stability Pool contract for rETH deposits
const LIQUITY_STABILITY_POOL =
  "0x66017d22b0f8556afdd19fc67041899eb65a21bb" as Address;

// Method ID for provideToSP function (provideToSP(uint256,address))
// This is the method ID for the provideToSP function in Liquity's Stability Pool
const PROVIDE_TO_SP_METHOD_ID = "0x3b4da69f";

async function hasDepositedRethToLiquityStabilityPool(
  address: Address
): Promise<boolean> {
  try {
    // Check if the address has interacted with Liquity's Stability Pool
    // using the provideToSP method for rETH deposits
    return await hasContractInteraction(
      address,
      LIQUITY_STABILITY_POOL,
      [PROVIDE_TO_SP_METHOD_ID], // Specific method ID for provideToSP
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error(
      "Error verifying Liquity rETH Stability Pool deposit:",
      error
    );
    throw new Error("Failed to verify Liquity rETH Stability Pool deposit");
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

    // Get verification result
    const mint_eligibility = await hasDepositedRethToLiquityStabilityPool(
      address as Address
    );

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        signature,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
