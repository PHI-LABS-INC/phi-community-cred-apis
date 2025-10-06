import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import {
  hasContractInteraction,
  getTransactions,
} from "@/app/lib/smart-wallet";

// Gitcoin Grants contract addresses
const GITCOIN_GRANTS_CONTRACTS: Address[] = [
  "0x7d655c57f71464B6f83811C55D84009Cd9f5221C", //imp
  "0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F",
  "0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6",
  "0x4AAcca72145e1dF2aeC137E1f3C5E3D75DB8b5f3"
] as Address[];

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

    // Get verification results
    const [mint_eligibility, data] = await verifyGitcoinContributor(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        data,
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

/**
 * Verifies if an address has contributed to Gitcoin Grants
 * Checks transaction history with the Gitcoin Grants contracts using hasContractInteraction
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string transaction count]
 * @throws Error if verification fails
 */
async function verifyGitcoinContributor(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Check for any interaction with any of the Gitcoin Grants contracts
    let hasInteraction = false;
    for (const contract of GITCOIN_GRANTS_CONTRACTS) {
      if (
        await hasContractInteraction(
          address,
          contract,
          [], // No specific methods
          1, // At least 1 interaction
          1 // Ethereum mainnet
        )
      ) {
        hasInteraction = true;
        break;
      }
    }

    if (hasInteraction) {
      // Get the exact count of interactions with all contracts
      const txs = await getTransactions(address, 1); // Ethereum mainnet
      const gitcoinTransactions = txs.filter((tx) =>
        GITCOIN_GRANTS_CONTRACTS.some(
          (contract) => tx.to?.toLowerCase() === contract.toLowerCase()
        )
      );
      return [true, gitcoinTransactions.length.toString()];
    }

    return [false, "0"];
  } catch (error) {
    console.error("Error verifying Gitcoin contributions:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    // Return false instead of throwing to handle errors gracefully
    return [false, "0"];
  }
}
