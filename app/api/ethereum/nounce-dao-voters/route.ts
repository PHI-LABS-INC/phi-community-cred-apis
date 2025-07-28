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
 * This function uses hasContractInteraction to check if any transaction was made
 * to the target contract's castVote function.
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if the address has cast a vote
 * @throws Error if the verification process fails
 */
async function verifyNounceDaoVote(address: Address): Promise<boolean> {
  try {
    const targetContractAddress =
      "0x6f3e6272a167e8accb32072d08e0957f9c79223d" as Address;
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
    return await hasContractInteraction(
      address,
      targetContractAddress,
      castVoteFunctionSignatures,
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying Nounce DAO vote:", error);
    throw new Error("Failed to verify Nounce DAO vote");
  }
}
