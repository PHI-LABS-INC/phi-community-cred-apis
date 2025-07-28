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

    // Check if the address has purchased art on ArtBlocks
    const mint_eligibility = await verifyArtBlocksPurchaser(address as Address);

    // Generate cryptographic signature of the verification result
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
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in artblocks-purchaser verifier:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if the address has purchased art on ArtBlocks
 */
async function verifyArtBlocksPurchaser(address: Address): Promise<boolean> {
  try {
    // ArtBlocks main contract address
    const artBlocksContract =
      "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270" as Address;

    console.log(`Checking if ${address} has purchased art on ArtBlocks`);

    // Check if any transaction to ArtBlocks contract occurred
    return await hasContractInteraction(
      address,
      artBlocksContract,
      [], // No specific method IDs required
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying ArtBlocks purchaser status:", error);
    return false;
  }
}
