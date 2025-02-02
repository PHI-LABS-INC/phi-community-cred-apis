import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const API_KEY = process.env.BASE_SCAN_API_KEY;
if (!API_KEY) {
  throw new Error("No API key configured");
}

async function fetchWithRetry(
  url: string,
  retries = 3
): Promise<Record<string, any>> {
  const tryFetch = async (attempt: number) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, { signal: controller.signal });
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
    } catch (error) {
      if (attempt < retries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 5000);
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

    // Get verification results
    const [mint_eligibility] = await verifyTimeswapLiquidity(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: mint_eligibility as boolean,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: mint_eligibility as boolean,
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
    console.error("Error in handler:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Verifies if an address has provided liquidity to Timeswap pools on Base
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status]
 */
async function verifyTimeswapLiquidity(address: Address): Promise<[boolean]> {
  try {
    // Timeswap V2 Factory contract on Base
    const TIMESWAP_FACTORY = "0xA68dF33b095c2897123416cbd517ed314E46fF62";

    // Query transactions to/from the factory using Basescan API
    const data = await fetchWithRetry(
      `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
    );

    if (data.status === "0" && data.message === "NOTOK") {
      throw new Error(
        typeof data.result === "string" ? data.result : "API request failed"
      );
    }

    if (!data.result || !Array.isArray(data.result)) {
      return [false];
    }

    // Check if any transactions were interactions with Timeswap Factory
    const hasProvidedLiquidity = data.result.some(
      (tx) =>
        tx.to.toLowerCase() === TIMESWAP_FACTORY.toLowerCase() &&
        tx.isError === "0"
    );

    return [hasProvidedLiquidity];
  } catch (error) {
    console.error("Error verifying Timeswap liquidity:", error);
    throw new Error(
      `Failed to verify Timeswap liquidity: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
