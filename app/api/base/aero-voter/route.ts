import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

// Official Aerodrome Voter contract
const AERODROME_VOTER = "0x16613524e02ad97eDfeF371bC883F2F5d6C480A5";
const VOTE_METHOD_ID = "0x7ac09bf7"; // vote(uint256 _tokenId,address[] _poolVote,uint256[] _weights)

async function hasVotedInAerodrome(address: Address): Promise<boolean> {
  try {
    // Check if address has voted in Aerodrome governance at least once
    const transactions = await getTransactions(address, 8453);

    console.log("transactions", transactions);

    // Filter transactions for voter contract interactions with vote method
    const voterTxs = transactions.filter((tx) => {
      if (!tx.to) return false;
      if (tx.to.toLowerCase() !== AERODROME_VOTER.toLowerCase()) return false;
      return tx.methodId?.toLowerCase() === VOTE_METHOD_ID.toLowerCase();
    });

    console.log("Found voter transactions:", voterTxs.length);
    return voterTxs.length > 0;
  } catch (error) {
    console.error("Error verifying Aerodrome votes:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Aerodrome votes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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

    const mint_eligibility = await hasVotedInAerodrome(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
