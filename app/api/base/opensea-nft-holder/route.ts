import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

// OpenSea API Endpoint
const OPENSEA_API_URL = "https://api.opensea.io/api/v2/chain/base/account";

// Maximum number of retries for fetching NFT data
const MAX_RETRIES = 3;

// Helper function to add a delay between retries
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gets the number of NFTs owned by an address on OpenSea for the Base network.
 * @param address - Ethereum address to check
 * @returns {Promise<[boolean]>} - Tuple containing eligibility status and number of NFTs
 */
async function getNFTCountOnOpenSeaBase(address: Address): Promise<boolean> {
  for (let attempts = 0; attempts < MAX_RETRIES; attempts++) {
    try {
      const url = `${OPENSEA_API_URL}/${address}/nfts`;
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "x-api-key": process.env.OPENSEA_API_KEY || "",
        },
        cache: "no-store", // Ensure we always fetch fresh data
      });

      if (!response.ok) {
        console.error("Error fetching OpenSea data:", response.statusText);
        continue;
      }

      const data = await response.json();
      const nftCount = data.nfts?.length || 0;
      return nftCount > 0;
    } catch (error) {
      console.error("Error checking NFTs on OpenSea:", error);
      if (attempts === MAX_RETRIES - 1) {
        throw new Error("Failed to verify NFT ownership on OpenSea.");
      }
      await delay(500);
    }
  }

  return false;
}

/**
 * GET API Handler
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address || !isAddress(address)) {
    return new Response(
      JSON.stringify({
        error: address
          ? "Invalid Ethereum address format"
          : "Address parameter is required",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const result = await verifyMultipleWalletsSimple(
      req,
      getNFTCountOnOpenSeaBase
    );
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
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
        error: "Internal server error",
        details:
          error instanceof Error ? error.message : "Unknown error occurred",
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
