import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Gitcoin Grants contract address
const GITCOIN_GRANTS_CONTRACT = "0xdf869FAD6dB91f437B59F1EdEFab319493D4C4cE";

// Type for Etherscan transaction response
interface EtherscanTransaction {
  to?: string;
  from?: string;
  hash: string;
  value: string;
  blockNumber: string;
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
 * Checks transaction history with the Gitcoin Grants contract using Etherscan API
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string transaction count]
 * @throws Error if verification fails
 */
async function verifyGitcoinContributor(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Check for transactions with Gitcoin Grants contract using Etherscan API
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&apikey=${process.env.ETHERSCAN_API_KEY}`
    );

    const data = await response.json();

    if (!response.ok || data.status !== "1") {
      console.error("Etherscan API error:", data);
      return [false, "0"];
    }

    // Filter transactions that interact with Gitcoin Grants contract
    const gitcoinTransactions = data.result.filter(
      (tx: EtherscanTransaction) =>
        tx.to?.toLowerCase() === GITCOIN_GRANTS_CONTRACT.toLowerCase() ||
        (tx.from?.toLowerCase() === address.toLowerCase() &&
          tx.to?.toLowerCase() === GITCOIN_GRANTS_CONTRACT.toLowerCase())
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
