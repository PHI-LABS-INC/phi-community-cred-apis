import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

// Gitcoin Grants contract address
const GITCOIN_GRANTS_CONTRACT =
  "0xdf869FAD6dB91f437B59F1EdEFab319493D4C4cE" as Address;

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
 * Checks transaction history with the Gitcoin Grants contract using hasContractInteraction
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string transaction count]
 * @throws Error if verification fails
 */
async function verifyGitcoinContributor(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Use getTransactions to count all interactions with the Gitcoin Grants contract
    const txs = await getTransactions(address, 1); // Ethereum mainnet
    const gitcoinTransactions = txs.filter(
      (tx) => tx.to?.toLowerCase() === GITCOIN_GRANTS_CONTRACT.toLowerCase()
    );
    const contributionCount = gitcoinTransactions.length;
    const isEligible = contributionCount > 0;
    return [isEligible, contributionCount.toString()];
  } catch (error) {
    console.error("Error verifying Gitcoin contributions:", error);
    throw new Error(
      `Failed to verify Gitcoin contributions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
