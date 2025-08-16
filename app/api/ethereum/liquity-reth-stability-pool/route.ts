import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Liquity Stability Pool contract for rETH deposits
const LIQUITY_STABILITY_POOL =
  "0xd442E41019B7F5C4dD78F50dc03726C446148695" as Address;

// Method ID for provideToSP function (provideToSP(uint256,bool))
// This is the method ID for the provideToSP function in Liquity V2 Stability Pool
const PROVIDE_TO_SP_METHOD_ID = "0xaeb4b970";

/**
 * Verifies if an address has deposited rETH to Liquity Stability Pool
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has deposited rETH to Liquity Stability Pool
 */
async function hasDepositedRethToLiquityStabilityPool(
  address: Address
): Promise<boolean> {
  try {
    // First try with specific method ID
    const specificCheck = await hasContractInteraction(
      address,
      LIQUITY_STABILITY_POOL,
      [PROVIDE_TO_SP_METHOD_ID], // Specific method ID for provideToSP
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );

    if (specificCheck) {
      return true;
    }

    const generalCheck = await hasContractInteraction(
      address,
      LIQUITY_STABILITY_POOL,
      [], // No method ID restrictions - check for any interaction
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );

    return generalCheck;
  } catch (error) {
    console.error(
      "Error verifying Liquity rETH Stability Pool deposit:",
      error
    );
    return false;
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
