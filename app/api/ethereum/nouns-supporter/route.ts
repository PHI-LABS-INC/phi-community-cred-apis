import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { mainnet, base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

// Nouns-related NFT contract addresses by chain
const ETHEREUM_CONTRACTS = {
  NOUNS: "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03", // Main Nouns NFT ETH
  LIL_NOUNS: "0x4b10701bfd7bfedc47d50562b76b436fbb5bdb3b", // Lil Nouns ETH
};

const BASE_CONTRACTS = {
  GNAR: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17", // GNAR
  BASE_NOUNS: "0xbf57d0535e10e7033447174404b9bed3d9ef4c88", // Base Nouns
  YELLOW_COLLECTIVE: "0xcb2aced00157337b25dd2824c3863c2159bdaf1b", // Yellow Collective
  COLLECTIVE_NOUNS: "0x220e41499cf4d93a3629a5509410cbf9e6e0b109", // Collective Nouns
};

// Create public clients for different chains
const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Standard ERC721 balanceOf ABI
const ERC721_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

async function verifyNounsSupporter(address: Address): Promise<boolean> {
  try {
    console.log("Checking Nouns ecosystem NFT ownership for address:", address);

    let totalNFTs = 0;

    // Check Ethereum contracts
    for (const [contractName, contractAddress] of Object.entries(
      ETHEREUM_CONTRACTS
    )) {
      try {
        const balance = await ethereumClient.readContract({
          address: contractAddress as Address,
          abi: ERC721_ABI,
          functionName: "balanceOf",
          args: [address],
        });

        const balanceNumber = Number(balance);
        totalNFTs += balanceNumber;

        if (balanceNumber > 0) {
          console.log(`${contractName} (ETH): ${balanceNumber} NFTs`);
        }
      } catch (error) {
        console.warn(`Error checking ${contractName} on Ethereum:`, error);
      }
    }

    // Check Base contracts
    for (const [contractName, contractAddress] of Object.entries(
      BASE_CONTRACTS
    )) {
      try {
        const balance = await baseClient.readContract({
          address: contractAddress as Address,
          abi: ERC721_ABI,
          functionName: "balanceOf",
          args: [address],
        });

        const balanceNumber = Number(balance);
        totalNFTs += balanceNumber;

        if (balanceNumber > 0) {
          console.log(`${contractName} (BASE): ${balanceNumber} NFTs`);
        }
      } catch (error) {
        console.warn(`Error checking ${contractName} on Base:`, error);
      }
    }

    const hasNounsNFTs = totalNFTs > 0;
    console.log(`Address ${address}: Total ${totalNFTs} Nouns ecosystem NFTs`);

    return hasNounsNFTs;
  } catch (error) {
    console.error("Error verifying Nouns supporter status:", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify ownership directly
    const mint_eligibility = await verifyNounsSupporter(address as Address);

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
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
    console.error("Error in API handler:", error);

    return new Response(
      JSON.stringify({
        mint_eligibility: false,
        signature: null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
