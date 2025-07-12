import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 2000;

const requestTimestamps = new Map<string, number>();

function isRateLimited(address: string): boolean {
  const lastRequest = requestTimestamps.get(address);
  const now = Date.now();

  if (lastRequest && now - lastRequest < RATE_LIMIT_DELAY) {
    return true;
  }

  requestTimestamps.set(address, now);
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    // Check rate limiting
    if (isRateLimited(address)) {
      return new Response(
        JSON.stringify({
          error:
            "Rate limit exceeded. Please wait before making another request.",
          retry_after: RATE_LIMIT_DELAY / 1000,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": (RATE_LIMIT_DELAY / 1000).toString(),
          },
        }
      );
    }

    // Check if the address has minted art on Zora
    const [mint_eligibility, firstMintData] = await verifyFirstZoraMint(
      address as Address
    );

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: firstMintData,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        data: firstMintData,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in my-first-zora verifier:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address has minted art on Zora and returns first mint data
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string first mint data]
 * @throws Error if verification fails
 */
async function verifyFirstZoraMint(
  address: Address
): Promise<[boolean, string]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // GraphQL query to get profile and first minted items from official Zora API
      const query = `
query ProfileAndMints($address: String!) {
  profile(identifier: $address) {
    created: profileCollectionsAndTokens(listType: CREATED) {
      count
    }
    collected: profileCollectionsAndTokens(listType: COLLECTED) {
      count
    }
  }
}
      `;

      const response = await fetch("https://api.zora.co/universal/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Phi-Community-Cred-APIs/1.0",
        },
        body: JSON.stringify({
          query,
          variables: { address: address.toLowerCase() },
        }),
      });

      if (response.status === 429) {
        // Rate limited - wait with exponential backoff
        const retryDelay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        console.log(
          `Rate limited by Zora API, attempt ${attempt}/${MAX_RETRIES}, waiting ${retryDelay}ms`
        );
        await sleep(retryDelay);
        lastError = new Error(`Zora API rate limited: ${response.status}`);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Zora API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`Zora API errors: ${JSON.stringify(data.errors)}`);
      }

      const profile = data.data?.profile;
      if (!profile) {
        return [false, ""];
      }

      const createdCount = profile.created?.count || 0;
      const collectedCount = profile.collected?.count || 0;

      // Return true if user has either created or collected any items
      const hasActivity = createdCount > 0 || collectedCount > 0;

      if (hasActivity) {
        return [true, (createdCount + collectedCount).toString()];
      }

      return [false, ""];
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Error verifying first Zora mint (attempt ${attempt}/${MAX_RETRIES}):`,
        error
      );

      // If this is the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const retryDelay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      await sleep(retryDelay);
    }
  }

  // If we get here, all retries failed
  throw new Error(
    `Failed to verify first Zora mint after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}
