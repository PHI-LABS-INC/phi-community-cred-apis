import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

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

    // Check if the address has cast a vote in the Nounce DAO
    const hasCastVote = await verifyNounceDaoVote(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: hasCastVote,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: hasCastVote, signature }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in Nounce DAO vote verification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if the given address has cast a vote in the Nounce DAO.
 *
 * This function uses the Etherscan API to fetch the transaction history
 * of the provided address and checks if any transaction was made to the target contract's castVote function.
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if the address has cast a vote
 * @throws Error if the verification process fails
 */
async function verifyNounceDaoVote(address: Address): Promise<boolean> {
  try {
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
    if (!ETHERSCAN_API_KEY) {
      throw new Error("Missing Etherscan API key");
    }

    // Fetch the transaction list for the given address using Etherscan API
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!Array.isArray(data.result)) {
      console.error("Etherscan API error: result is not an array", data);
      throw new Error("Failed to fetch transactions from Etherscan");
    }

    // If no transactions are found (Etherscan returns status "0" with an empty result), treat it as a valid case.
    if (
      data.status !== "1" &&
      !(data.status === "0" && data.result.length === 0)
    ) {
      console.error("Etherscan API error:", data);
      throw new Error("Failed to fetch transactions from Etherscan");
    }

    const targetContractAddress = "0x6f3e6272a167e8accb32072d08e0957f9c79223d";
    const castVoteFunctionSignatures = [
      "0x7b3c71d3", // castVoteWithReason
      "0x3bccf4fd", // castVoteBySig
      "0x56781388", // castVote
      "0x8136730f", // castRefundableVoteWithReason
      "0x64c05995", // castRefundableVoteWithReason
      "0x44fac8f6", // castRefundableVote
      "0x8f1447d9", // castRefundableVote
    ];

    // Check if any transaction to the target contract's castVote function occurred
    const hasCastVote = data.result.some(
      (tx: { to: string; input: string }) => {
        return (
          tx.to &&
          tx.to.toLowerCase() === targetContractAddress &&
          castVoteFunctionSignatures.some((signature) =>
            tx.input.startsWith(signature)
          )
        );
      }
    );

    return hasCastVote;
  } catch (error) {
    console.error("Error verifying Nounce DAO vote via Etherscan:", error);
    throw new Error("Failed to verify Nounce DAO vote");
  }
}
