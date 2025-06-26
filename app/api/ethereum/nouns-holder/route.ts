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

    // Check if the address holds at least 1 Nouns NFT
    const holdsNounsNFT = await verifyNounsNFTHolder(address as Address);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: holdsNounsNFT,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: holdsNounsNFT, signature }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in Nouns NFT holder verification:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if the given address holds at least 1 Nouns NFT.
 *
 * This function uses the Etherscan API to query the Nouns Token contract
 * and checks the balance of the provided address.
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if the address holds at least 1 Nouns NFT
 * @throws Error if the verification process fails
 */
async function verifyNounsNFTHolder(address: Address): Promise<boolean> {
  try {
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
    if (!ETHERSCAN_API_KEY) {
      throw new Error("Missing Etherscan API key");
    }

    const nounsTokenContract = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03";

    // Use Etherscan API to call balanceOf function on Nouns Token contract
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_call&to=${nounsTokenContract}&data=0x70a08231000000000000000000000000${address
      .slice(2)
      .toLowerCase()}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("Etherscan API error:", data.error);
      throw new Error("Failed to fetch balance from Etherscan");
    }

    if (!data.result) {
      console.error("Etherscan API returned no result:", data);
      throw new Error("Failed to fetch balance from Etherscan");
    }

    // Convert hex result to decimal
    const balance = parseInt(data.result, 16);

    // Return true if balance is greater than 0
    return balance > 0;
  } catch (error) {
    console.error("Error verifying Nouns NFT holder via Etherscan:", error);
    throw new Error("Failed to verify Nouns NFT holder");
  }
}
