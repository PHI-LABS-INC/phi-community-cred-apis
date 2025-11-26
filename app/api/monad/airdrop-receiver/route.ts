import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const BLOCKVISION_API_KEY = process.env.BLOCKVISION_API_KEY;

interface BlockVisionToken {
  contractAddress: string;
  name: string;
  imageURL: string;
  symbol: string;
  price: string;
  decimal: number;
  balance: string;
  verified: boolean;
}

interface BlockVisionResponse {
  code: number;
  reason?: string;
  message: string;
  result: {
    data: BlockVisionToken[];
    total: number;
    firstSeen: number;
    usdValue: number;
  };
}

/**
 * Fetches account tokens from BlockVision API for Monad
 * @param address - Monad address to check
 * @returns Promise<BlockVisionResponse> Token data from BlockVision
 */
async function fetchMonadAccountTokens(
  address: string
): Promise<BlockVisionResponse> {
  try {
    const url = new URL("https://api.blockvision.org/v2/monad/account/tokens");
    url.searchParams.set("address", address);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key if available
    if (BLOCKVISION_API_KEY) {
      headers["X-API-Key"] = BLOCKVISION_API_KEY;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching BlockVision data:", error);
    throw new Error("Failed to fetch Monad account tokens");
  }
}

/**
 * Verifies if an address has received any tokens on Monad (indicating airdrop eligibility)
 * An address is considered eligible if it has any tokens with balance > 0
 * @param address - Monad address to check
 * @returns Promise<boolean> Whether address has received tokens (airdrop eligible)
 */
async function verifyMonadAirdropReceiver(address: Address): Promise<boolean> {
  try {
    const response = await fetchMonadAccountTokens(address);

    // Check if API call was successful
    if (response.code !== 0) {
      console.error(
        "BlockVision API error:",
        response.reason || response.message
      );
      return false;
    }

    // Check if address has any tokens with balance > 0
    const hasTokens = response.result.data.some((token) => {
      const balance = BigInt(token.balance || "0");
      return balance > BigInt(0);
    });

    return hasTokens;
  } catch (error) {
    console.error("Error verifying Monad airdrop receiver:", error);
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

    // Get verification results
    const mint_eligibility = await verifyMonadAirdropReceiver(
      address as Address
    );

    // Generate cryptographic signature of the verification results
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
    console.error("Error in Monad airdrop receiver handler:", error);
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
