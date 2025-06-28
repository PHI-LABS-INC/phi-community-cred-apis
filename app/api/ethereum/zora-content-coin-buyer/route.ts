import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";
import PQueue from "p-queue";

// Zora Content Coin contract address (this would need to be the actual contract address)
const ZORA_CONTENT_COIN_CONTRACT = "0x1111111111166b7fe7bd91427724b487980afc69"; // Placeholder - needs actual address

// Zora Content Coin feature launch date (this would need to be the actual launch date)
const CONTENT_COIN_LAUNCH_DATE = new Date("2025-04-23T00:00:00Z"); // April 23, 2025
const EARLY_ADOPTER_WINDOW_DAYS = 30;

// Create queue for API key
const API_KEY = process.env.ETHERSCAN_API_KEY;
if (!API_KEY) {
  throw new Error("No API key configured");
}

// Create a queue with rate limits
const queue = new PQueue({ interval: 1000, intervalCap: 5 });

async function fetchWithRateLimit(
  url: string,
  retries = 5
): Promise<Record<string, unknown>> {
  const tryFetch = async (attempt: number) => {
    try {
      const fetchWithTimeout = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(
            url.replace(/apikey=([^&]*)/, `apikey=${API_KEY}`),
            { signal: controller.signal }
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          clearTimeout(timeout);
          return data;
        } catch (error) {
          clearTimeout(timeout);
          throw error;
        }
      };

      return await queue.add(fetchWithTimeout);
    } catch (error: unknown) {
      console.warn(
        `Attempt ${attempt} failed:`,
        error instanceof Error ? error.message : String(error)
      );

      if (attempt < retries) {
        const backoff = Math.min(
          1000 * Math.pow(2, attempt) + Math.random() * 1000,
          10000
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return tryFetch(attempt + 1);
      }
      throw error;
    }
  };

  return tryFetch(1);
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

    const { mint_eligibility, data } = await verifyMultipleWallets(
      req,
      verifyContentCoinPurchase
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility,
      data: data || "0",
    });

    return new Response(
      JSON.stringify({ mint_eligibility, data: data || "0", signature }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Verifies if an address has purchased Content Coins within 30 days after Zora's Content Coin feature launch
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, number purchase count, Date first purchase date]
 * @throws Error if verification fails
 */
async function verifyContentCoinPurchase(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Calculate the cutoff date (30 days after launch)
    const cutoffDate = new Date(
      CONTENT_COIN_LAUNCH_DATE.getTime() +
        EARLY_ADOPTER_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    // Get Content Coin transfers for this address using v2 API for better compatibility
    const data = await fetchWithRateLimit(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&contractaddress=${ZORA_CONTENT_COIN_CONTRACT}&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`
    );

    if (data.status === "0" && data.message === "NOTOK") {
      if (data.result === "Missing/Invalid API Key") {
        throw new Error("Missing or invalid API key");
      }
      if (
        typeof data.result === "string" &&
        data.result.includes("Max rate limit reached")
      ) {
        throw new Error("Rate limit reached");
      }
      throw new Error(
        typeof data.result === "string" ? data.result : "API request failed"
      );
    }

    if (
      !data.result ||
      !Array.isArray(data.result) ||
      data.result.length === 0
    ) {
      return [false, "0"];
    }

    const transfers = data.result;
    let purchaseCount = 0;

    // Check each transfer for purchases within the early adopter window
    for (const transfer of transfers) {
      // Only count incoming transfers (purchases)
      if (transfer.to.toLowerCase() !== address.toLowerCase()) continue;

      const transferDate = new Date(parseInt(transfer.timeStamp) * 1000);

      // Check if transfer is within the early adopter window
      if (
        transferDate >= CONTENT_COIN_LAUNCH_DATE &&
        transferDate <= cutoffDate
      ) {
        purchaseCount++;
      }
    }

    const isEligible = purchaseCount > 0;

    console.log(
      `Address ${address} has purchased Content Coins ${purchaseCount} times within early adopter window, eligible: ${isEligible}`
    );

    return [isEligible, purchaseCount.toString()];
  } catch (error) {
    console.error("Error verifying Content Coin purchase:", error);
    throw error;
  }
}
