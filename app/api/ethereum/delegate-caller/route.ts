import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import PQueue from "p-queue";

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
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  try {
    let result;
    for (let i = 0; i < 3; i++) {
      try {
        result = await verifyDelegateCall(address as Address);
        break;
      } catch (error) {
        if (i === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    const [mint_eligibility, delegateCount] = result!;

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: delegateCount.toString(),
    });

    return NextResponse.json(
      {
        mint_eligibility,
        data: delegateCount.toString(),
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
 * Verifies if an address has called the delegate method at least once
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, number delegate call count]
 * @throws Error if verification fails
 */
async function verifyDelegateCall(
  address: Address
): Promise<[boolean, number]> {
  try {
    // Use Etherscan v2 API to get transactions
    const data = await fetchWithRateLimit(
      `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
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
      return [false, 0];
    }

    const transactions = data.result;
    let delegateCount = 0;

    // Function signatures for common delegate methods
    const delegateSignatures = [
      "0x5c19a95c", // delegate(address) - ERC20Votes/ERC721Votes
      "0xb3f00674", // delegate(address) - OpenZeppelin Votes
      "0x1cff79cd", // delegate(address) - Compound-like governance
      "0x2e17de78", // delegate(address) - Uniswap governance
      "0x6f307dc3", // delegate(address) - Aave governance
      "0x8c1d8f0b", // delegate(address) - Balancer governance
      "0x9c395bcb", // delegate(address) - Curve governance
      "0x1f2a2005", // delegate(address) - Yearn governance
      "0x485cc955", // delegate(address) - Synthetix governance
      "0x7d7eabc2", // delegate(address) - Maker governance
    ];

    // Check each transaction for delegate function calls
    for (const tx of transactions) {
      if (!tx.input || tx.input === "0x") continue;

      const input = tx.input.toLowerCase();

      // Check if the transaction input starts with any delegate function signature
      for (const signature of delegateSignatures) {
        if (input.startsWith(signature)) {
          delegateCount++;
          break; // Count each transaction only once even if it matches multiple signatures
        }
      }
    }

    const isEligible = delegateCount > 0;

    console.log(
      `Address ${address} has called delegate method ${delegateCount} times, eligible: ${isEligible}`
    );

    return [isEligible, delegateCount];
  } catch (error) {
    console.error("Error verifying delegate calls:", error);
    throw error;
  }
}
