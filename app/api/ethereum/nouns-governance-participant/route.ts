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

    // Check if the address has participated in Nouns DAO governance
    const hasParticipatedInGovernance =
      await verifyNounsGovernanceParticipation(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: hasParticipatedInGovernance,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: hasParticipatedInGovernance,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(
      "Error in Nouns DAO governance participation verification:",
      error
    );
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if the given address has participated in Nouns DAO governance by voting on at least 1 proposal.
 *
 * This function uses the Etherscan API to fetch the transaction history
 * of the provided address and checks if any transaction was made to the Nouns DAO governance contract's voting functions.
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if the address has voted on at least 1 proposal
 * @throws Error if the verification process fails
 */
async function verifyNounsGovernanceParticipation(
  address: Address
): Promise<boolean> {
  try {
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
    if (!ETHERSCAN_API_KEY) {
      throw new Error("Missing Etherscan API key");
    }

    // Fetch the transaction list for the given address using Etherscan API
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
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

    // Nouns DAO governance contract addresses (proxy and implementations)
    const nounsDAOContracts = [
      "0x6f3e6272a167e8accb32072d08e0957f9c79223d", // Nouns DAO Proxy (main governance contract)
    ];

    // Function signatures for voting in Nouns DAO
    const voteFunctionSignatures = [
      "0x7b3c71d3", // castVoteWithReason(uint256,uint8,string)
      "0x3bccf4fd", // castVoteBySig(uint256,uint8,uint8,bytes32,bytes32)
      "0x56781388", // castVote(uint256,uint8)
      "0x8136730f", // castRefundableVoteWithReason(uint256,uint8,string)
      "0x64c05995", // castRefundableVoteWithReason(uint256,uint8,string)
      "0x44fac8f6", // castRefundableVote(uint256,uint8)
      "0x8f1447d9", // castRefundableVote(uint256,uint8)
    ];

    // Check if any transaction to the Nouns DAO governance contract's voting functions occurred
    const hasVotedInGovernance = data.result.some(
      (tx: { to: string; input: string }) => {
        return (
          tx.to &&
          nounsDAOContracts.some(
            (contract) => tx.to.toLowerCase() === contract
          ) &&
          voteFunctionSignatures.some((signature) =>
            tx.input.startsWith(signature)
          )
        );
      }
    );

    return hasVotedInGovernance;
  } catch (error) {
    console.error(
      "Error verifying Nouns DAO governance participation via Etherscan:",
      error
    );
    throw new Error("Failed to verify Nouns DAO governance participation");
  }
}
