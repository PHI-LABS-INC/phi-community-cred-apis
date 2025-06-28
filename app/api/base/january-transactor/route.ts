import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { isWithinInterval } from "date-fns";
import { createSignature } from "@/app/lib/signature";
import PQueue from "p-queue";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

// Create separate queues for each API key
const API_KEYS = (process.env.BASE_SCAN_API_KEYS_BATCH || "")
  .split(",")
  .filter(Boolean);
if (API_KEYS.length === 0) {
  throw new Error("No API keys configured");
}

// Create a queue for each API key with higher rate limits
const queues = API_KEYS.map(
  () => new PQueue({ interval: 1000, intervalCap: 5 })
); // Reduced to 5 requests per second per API key to be safer

let currentQueueIndex = 0;

async function fetchWithRateLimit(
  url: string,
  retries = 5
): Promise<Record<string, unknown>> {
  const tryFetch = async (attempt: number) => {
    const queue = queues[currentQueueIndex];
    const apiKey = API_KEYS[currentQueueIndex];

    // Round-robin between API keys
    currentQueueIndex = (currentQueueIndex + 1) % API_KEYS.length;

    try {
      const fetchWithTimeout = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          const response = await fetch(
            url.replace(/apikey=([^&]*)/, `apikey=${apiKey}`),
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

      // Execute request with queue to ensure rate limiting
      return await queue.add(fetchWithTimeout);
    } catch (error: unknown) {
      console.warn(
        `Attempt ${attempt} failed:`,
        error instanceof Error ? error.message : String(error)
      );

      if (attempt < retries) {
        // Exponential backoff with jitter
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
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  try {
    const result = await verifyMultipleWallets(req, verifyJanuaryTransaction);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility: result.mint_eligibility,
      data: result.data,
    });

    return NextResponse.json(
      {
        mint_eligibility: result.mint_eligibility,
        data: result.data,
        signature,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return NextResponse.json(
      { error: "Please try again later" },
      { status: 500 }
    );
  }
}

/**
 * Verifies if an address has transactions in January 2025
 *
 * @param address - Ethereum address to check transactions for
 * @returns Tuple containing [boolean eligibility status, string transaction count]
 * @throws Error if transaction verification fails
 */
async function verifyJanuaryTransaction(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Fetch transaction history from Basescan API using optimized rate limiter
    const data = await fetchWithRateLimit(
      `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEYS[0]}`
    );

    // Check for API errors
    if (data.status === "0" && data.message === "NOTOK") {
      if (data.result === "Missing/Invalid API Key") {
        throw new Error("Missing or invalid API key");
      }
      if (
        typeof data.result === "string" &&
        data.result.includes("Max rate limit reached")
      ) {
        // Will trigger retry with different API key
        throw new Error("Rate limit reached");
      }
      throw new Error(
        typeof data.result === "string" ? data.result : "API request failed"
      );
    }

    // Return default values if no transaction data
    if (
      !data.result ||
      !Array.isArray(data.result) ||
      data.result.length === 0
    ) {
      return [false, "0"];
    }

    // Define the target time interval (January 2025)
    const targetInterval = {
      start: new Date("2025-01-01T00:00:00Z"),
      end: new Date("2025-01-31T23:59:59Z"),
    };

    // Optimize transaction counting with early return
    let januaryTxCount = 0;
    for (const tx of data.result) {
      const txDate = new Date(parseInt(tx.timeStamp) * 1000);
      if (isWithinInterval(txDate, targetInterval)) {
        januaryTxCount++;
        // Early return if we find at least one transaction (since that's all we need)
        if (januaryTxCount >= 1) {
          return [true, januaryTxCount.toString()];
        }
      }
    }

    return [false, "0"];
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw error; // Propagate error for retry logic
  }
}
