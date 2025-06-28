import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

// Nouns DAO Governor contract address
const NOUNS_DAO_GOVERNOR = "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d";

async function verifyNounsDAOVoter(address: Address): Promise<boolean> {
  try {
    console.log("Checking Nouns DAO voting activity for address:", address);

    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    // Check transactions to Nouns DAO Governor contract
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Look for transactions to the Nouns DAO Governor contract
      const daoTransactions = data.result.filter(
        (tx: { to?: string; isError: string; input: string }) =>
          tx.to?.toLowerCase() === NOUNS_DAO_GOVERNOR.toLowerCase() &&
          tx.isError === "0" && // Only successful transactions
          tx.input &&
          tx.input.length > 2 // Has input data
      );

      if (daoTransactions.length > 0) {
        // Further filter for voting-related transactions
        const votingTransactions = daoTransactions.filter(
          (tx: { input: string }) => {
            // Common voting method signatures:
            // castVote(uint256,uint8) - 0x56781388
            // castVoteWithReason(uint256,uint8,string) - 0x7b3c71d3
            // castVoteBySig(uint256,uint8,uint8,bytes32,bytes32) - 0x3bccf4fd
            const votingMethodIds = [
              "0x56781388", // castVote
              "0x7b3c71d3", // castVoteWithReason
              "0x3bccf4fd", // castVoteBySig
            ];

            return votingMethodIds.some((methodId) =>
              tx.input.startsWith(methodId)
            );
          }
        );

        if (votingTransactions.length > 0) {
          console.log(
            `Address ${address} has ${votingTransactions.length} voting transaction(s) in Nouns DAO`
          );
          return true;
        }
      }
    }

    console.log(`No Nouns DAO voting activity found for address ${address}`);
    return false;
  } catch (error) {
    console.error("Error verifying Nouns DAO voter status:", error);
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

    const { mint_eligibility } = await verifyMultipleWalletsSimple(
      req,
      verifyNounsDAOVoter
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
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
