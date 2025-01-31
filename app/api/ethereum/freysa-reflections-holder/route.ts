import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Contract ABI for ERC721 balanceOf
const ERC721_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

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
    const [mint_eligibility] = await verifyFreysaNFT(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address owns an NFT from the Freysa Reflections 2049 collection on Ethereum
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string NFT count]
 * @throws Error if verification fails
 */
async function verifyFreysaNFT(address: Address): Promise<[boolean]> {
  try {
    const FREYSA_CONTRACT = "0x3BFb2F2B61Be8f2f147F5F53a906aF00C263D9b3";

    // Query NFT balance directly from contract
    const balance = (await client.readContract({
      address: FREYSA_CONTRACT,
      abi: ERC721_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    const nftCount = Number(balance);
    const isEligible = nftCount > 0;

    return [isEligible];
  } catch (error) {
    console.error("Error verifying Freysa NFT:", error);
    throw new Error("Failed to verify Freysa NFT ownership");
  }
}
