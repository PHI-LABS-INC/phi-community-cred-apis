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
    const mint_eligibility = await verifyHistoricNFT(address as Address);

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
 * Verifies if an address owns NFTs from historically significant collections
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address owns any historic NFTs
 * @throws Error if verification fails
 */
async function verifyHistoricNFT(address: Address): Promise<boolean> {
  try {
    // Historically significant NFT collections with verified ERC721 contracts
    const HISTORIC_COLLECTIONS = [
      "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", // Bored Ape Yacht Club
      "0x60E4d786628Fea6478F785A6d7e704777c86a7c6", // Mutant Ape Yacht Club
      "0x06012c8cf97BEaD5deAe237070F9587f8E7A266d", // CryptoKitties
      "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", // Nouns
      "0xED5AF388653567Af2F388E6224dC7C4b3241C544", // Azuki
      "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e", // Doodles
      "0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B", // CloneX
      "0x1A92f7381B9F03921564a437210bB9396471050C", // Cool Cats
      "0xe785E82358879F061BC3dcAC6f0444462D4b5330", // World of Women
      "0x23581767a106ae21c074b2276D25e5C3e136a68b", // Moonbirds
      "0xa3AEe8BcE55BEeA1951EF834b99f3Ac60d1ABeeB", // VeeFriends
      "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270", // Art Blocks Curated
      "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a", // Chromie Squiggle
      "0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258", // BAYC Otherdeeds
      "0xFF9C1b15B16263C61d017ee9F65C50e4AE0113D7", // Loot (for Adventurers)
      "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8", // Pudgy Penguins
      "0xc3f733ca98E0daD0386979Eb96fb1722A1A05E69", // MoonCats (ERC721 wrapper)
    ];

    // Check each collection for ownership
    for (const contractAddress of HISTORIC_COLLECTIONS) {
      try {
        const balance = (await client.readContract({
          address: contractAddress as Address,
          abi: ERC721_ABI,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;

        const nftCount = Number(balance);
        if (nftCount > 0) {
          return true; // Found at least one historic NFT
        }
      } catch (error) {
        // Log error but continue checking other collections
        console.warn(`Error checking contract ${contractAddress}:`, error);
      }
    }

    return false; // No historic NFTs found
  } catch (error) {
    console.error("Error verifying historic NFT ownership:", error);
    throw new Error("Failed to verify historic NFT ownership");
  }
}
