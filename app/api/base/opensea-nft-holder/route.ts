import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";

// OpenSea API Endpoint
const OPENSEA_API_URL = "https://api.opensea.io/api/v2/chain/base/account";

// Maximum number of retries for fetching NFT data
const MAX_RETRIES = 3;

/**
 * Gets the number of NFTs owned by an address on OpenSea for the Base network.
 * @param address - Ethereum address to check
 * @returns {Promise<[boolean, number]>} - Tuple containing eligibility status and number of NFTs
 */
async function getNFTCountOnOpenSeaBase(
  address: Address
): Promise<[boolean, number]> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      // Request parameters for OpenSea API
      const url = `${OPENSEA_API_URL}/${address}/nfts`;

      // Fetch the data from OpenSea API
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "x-api-key": process.env.OPENSEA_API_KEY || "",
        },
      });

      if (!response.ok) {
        console.error("Error fetching OpenSea data:", response.statusText);
        attempts++;
        if (attempts >= MAX_RETRIES) {
          return [false, 0];
        }
        continue; // Retry on failure
      }

      const data = await response.json();

      // Get NFT count and return tuple
      const nftCount = data.nfts?.length || 0;
      return [nftCount > 0, nftCount];
    } catch (error) {
      console.error("Error checking NFTs on OpenSea:", error);
      attempts++;
      if (attempts >= MAX_RETRIES) {
        throw new Error("Failed to verify NFT ownership on OpenSea.");
      }
    }
  }

  // Fallback return in case of failure after retries
  return [false, 0];
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

    // Get NFT count
    const [mint_eligibility, nftCount] = await getNFTCountOnOpenSeaBase(
      address as Address
    );

    // Generate signature
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: nftCount.toString(),
    });

    // Return structured response
    return new Response(
      JSON.stringify({
        mint_eligibility,
        data: nftCount.toString(),
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
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
