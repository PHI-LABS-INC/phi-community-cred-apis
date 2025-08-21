import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Fluid Vault (fVLT) ERC-721 contract address on Base
const FLUID_VAULT_NFT = "0x324c5Dc1fC42c7a4D43d92df1eBA58a54d13Bf2d" as Address;

// ERC-721 ABI for balanceOf
const ERC721_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * Verifies if an address holds Fluid Vault (fVLT) ERC-721 tokens on Base
 *
 * @param address - Base address to check
 * @returns Boolean indicating if address holds Fluid Vault NFTs
 */
async function hasFluidVaultNFT(address: Address): Promise<boolean> {
  try {
    // Create Base chain client
    const { createPublicClient, http } = await import("viem");
    const { base } = await import("viem/chains");

    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Check ERC-721 balance
    const nftBalance = (await client.readContract({
      address: FLUID_VAULT_NFT,
      abi: ERC721_ABI,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;

    // User must have at least one Fluid Vault NFT
    return nftBalance > BigInt(0);
  } catch (error) {
    console.error("Error verifying Fluid Vault NFT balance:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
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

    const mint_eligibility = await hasFluidVaultNFT(address as Address);
    const signature = await createSignature({
      address: address as Address,
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
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
