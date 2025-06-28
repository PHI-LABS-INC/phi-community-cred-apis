import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

// Blockchain Configuration
const BLACKBIRD_CONTRACT_ADDRESS = "0x1dE409fC7613C234655f566A2969dD8a862E38B4"; // Blackbird Restaurant NFT contract

/**
 * Checks if a user owns a specific NFT on Base using OpenSea API.
 * @param {Address} address - Ethereum wallet address.
 * @returns {Promise<[boolean, string]>} - Returns if owns NFT and ownership details
 */
async function verifyBlackbirdOwnership(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Query OpenSea API to get all NFTs owned by the address
    const response = await fetch(
      `https://api.opensea.io/api/v2/chain/base/account/${address}/nfts`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": process.env.OPENSEA_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenSea API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if any of the NFTs are from the Blackbird contract
    const blackbirdNFTs =
      data.nfts?.filter(
        (nft: { contract: string }) =>
          nft.contract.toLowerCase() ===
          BLACKBIRD_CONTRACT_ADDRESS.toLowerCase()
      ) || [];

    const ownsNFT = blackbirdNFTs.length > 0;

    return [ownsNFT, blackbirdNFTs.length];
  } catch (error) {
    console.error("Error checking Blackbird ownership:", error);
    return [false, "Error checking NFT ownership via OpenSea"];
  }
}

/**
 * GET API Handler
 */
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

    // Verify ownership
    const result = await verifyMultipleWallets(req, verifyBlackbirdOwnership);

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
      data: result.data || "0",
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
        data: result.data || "0",
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

    // Return false eligibility instead of error response
    return new Response(
      JSON.stringify({
        mint_eligibility: false,
        data: "Error checking NFT ownership via OpenSea",
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
