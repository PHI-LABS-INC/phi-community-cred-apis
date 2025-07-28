import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

// Create public client for Ethereum mainnet
const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// ERC721 ABI for balanceOf function
const ERC721_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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
 * This function uses viem to query the Nouns Token contract
 * and checks the balance of the provided address.
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if the address holds at least 1 Nouns NFT
 * @throws Error if the verification process fails
 */
async function verifyNounsNFTHolder(address: Address): Promise<boolean> {
  try {
    const nounsTokenContract =
      "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03" as Address;

    // Use viem to call balanceOf function on Nouns Token contract
    const balance = await client.readContract({
      address: nounsTokenContract,
      abi: ERC721_ABI,
      functionName: "balanceOf",
      args: [address],
    });

    // Return true if balance is greater than 0
    return Number(balance) > 0;
  } catch (error) {
    console.error("Error verifying Nouns NFT holder:", error);
    throw new Error("Failed to verify Nouns NFT holder");
  }
}
