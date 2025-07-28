import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

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

    // Get verification results by checking if the wallet interacted with the specified contract
    const [mint_eligibility] = await verifyANS(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: mint_eligibility as boolean,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: mint_eligibility as boolean,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address has interacted with the specified contract using smart-wallet.ts.
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status]
 * @throws Error if verification fails
 */
async function verifyANS(address: Address): Promise<[boolean]> {
  try {
    const CONTRACT_ADDRESS = "0x9e711dD562DD7C84127780949Ac3FD5a83136676";

    // Check if address has interacted with the contract at least once
    const hasInteracted = await hasContractInteraction(
      address,
      CONTRACT_ADDRESS as Address,
      [], // No specific method required
      1, // At least 1 interaction
      8453 // Base chain
    );

    return [hasInteracted];
  } catch (error) {
    console.error("Error verifying contract interaction:", error);
    throw new Error("Failed to verify contract interaction");
  }
}
