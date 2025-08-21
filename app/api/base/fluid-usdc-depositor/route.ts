import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// Fluid lending markets contract addresses on Base
// These are the main contracts users interact with for USDC deposits
const FLUID_LENDING_CONTRACTS = [
  "0x324c5dc1fc42c7a4d43d92df1eba58a54d13bf2d", // Fluid Vault (fVLT) - main lending contract
] as const;

// Common method IDs for deposit functions in Fluid lending
const DEPOSIT_METHOD_ID = "0x6e553f65";

/**
 * Verifies if an address has deposited USDC into Fluid lending markets on Base
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has deposited USDC to Fluid lending
 */
async function hasDepositedUSDCTofFluidLending(
  address: Address
): Promise<boolean> {
  try {
    // Check for interactions with Fluid lending contracts
    for (const contract of FLUID_LENDING_CONTRACTS) {
      // Check for any interaction with the contract
      const hasInteraction = await hasContractInteraction(
        address,
        contract as Address,
        [], // No method ID restrictions - check for any interaction
        1, // At least 1 interaction
        8453 // Base chain
      );

      if (hasInteraction) {
        return true;
      }

      // Also check for specific deposit method interactions
      const hasDepositInteraction = await hasContractInteraction(
        address,
        contract as Address,
        [DEPOSIT_METHOD_ID],
        1, // At least 1 interaction
        8453 // Base chain
      );

      if (hasDepositInteraction) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error verifying Fluid USDC lending deposit:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
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
    const mint_eligibility = await hasDepositedUSDCTofFluidLending(
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
