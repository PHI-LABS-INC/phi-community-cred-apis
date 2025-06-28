import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import PQueue from "p-queue";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

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

/**
 * Verifies the first transaction date of an Ethereum address
 *
 * @param address - Ethereum address to check transactions for
 * @returns Tuple containing [boolean eligibility status, string first transaction date]
 * @throws Error if transaction verification fails
 */
async function verifyTransaction(address: Address): Promise<[boolean, string]> {
  try {
    const data = await fetchWithRateLimit(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`
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
      return [false, "No transactions found"];
    }

    // Get the first transaction's timestamp
    const firstTx = data.result[0];
    const firstTxDate = new Date(parseInt(firstTx.timeStamp) * 1000);

    return [true, firstTxDate.toISOString()];
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "Invalid address provided" },
        { status: 400 }
      );
    }

    const { mint_eligibility, data } = await verifyMultipleWallets(
      req,
      verifyTransaction
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility,
      data: data || "No transactions found",
    });

    return NextResponse.json(
      { mint_eligibility, data: data || "No transactions found", signature },
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
