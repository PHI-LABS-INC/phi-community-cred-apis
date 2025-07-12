import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

interface ZoraCollectionEdge {
  node: {
    media?: {
      previewImage?: {
        previewImage?: {
          downloadableUri?: string;
        };
      };
    };
  };
}

const ZORA_API_ENDPOINT = "https://api.zora.co/universal/graphql";
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

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

    // Get verification results
    const mint_eligibility = await verifyFirstZoraMint(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address has collected items with downloadable URIs on Zora
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has collected items with downloadable URIs
 * @throws Error if verification fails
 */
async function verifyFirstZoraMint(address: Address): Promise<boolean> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // GraphQL query to get profile and first minted items from official Zora API
      const query = `
query ProfileAndMints($address: String!) {
  profile(identifier: $address) {
    collectedCollectionsOrTokens(first: 1) {
      edges {
        node {
          media {
            previewImage {
              previewImage {
                downloadableUri
              }
            }
          }
        }
      }
    }
  }
}
      `;

      const response = await fetch(ZORA_API_ENDPOINT, {
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
        if (attempt < MAX_RETRIES) {
          const retryDelay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          console.log(
            `Rate limited by Zora API, attempt ${attempt}/${MAX_RETRIES}, waiting ${retryDelay}ms for address ${address}`
          );
          await sleep(retryDelay);
          continue;
        }
        console.log(
          `Rate limited by Zora API after ${MAX_RETRIES} attempts for address ${address}`
        );
        return false;
      }

      if (response.status === 503 || response.status === 502) {
        if (attempt < MAX_RETRIES) {
          const retryDelay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          console.log(
            `Zora API temporarily unavailable, attempt ${attempt}/${MAX_RETRIES}, waiting ${retryDelay}ms for address ${address}`
          );
          await sleep(retryDelay);
          continue;
        }
        console.log(
          `Zora API unavailable after ${MAX_RETRIES} attempts for address ${address}`
        );
        return false;
      }

      if (!response.ok) {
        if (attempt < MAX_RETRIES) {
          const retryDelay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          console.log(
            `Zora API request failed with status ${response.status}, attempt ${attempt}/${MAX_RETRIES}, waiting ${retryDelay}ms for address ${address}`
          );
          await sleep(retryDelay);
          continue;
        }
        console.log(
          `Zora API request failed with status ${response.status} after ${MAX_RETRIES} attempts for address ${address}`
        );
        return false;
      }

      const data = await response.json();

      if (data.errors) {
        if (attempt < MAX_RETRIES) {
          const retryDelay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          console.log(
            `Zora API GraphQL errors, attempt ${attempt}/${MAX_RETRIES}, waiting ${retryDelay}ms for address ${address}:`,
            data.errors
          );
          await sleep(retryDelay);
          continue;
        }
        console.log(
          `Zora API GraphQL errors after ${MAX_RETRIES} attempts for address ${address}:`,
          data.errors
        );
        return false;
      }

      const profile = data.data?.profile;
      if (!profile) {
        return false;
      }

      const collectedItems = profile.collectedCollectionsOrTokens?.edges || [];

      // Check if any collected item has a downloadable URI
      const hasDownloadableUri = collectedItems.some(
        (edge: ZoraCollectionEdge) => {
          const media = edge.node?.media;
          return media?.previewImage?.previewImage?.downloadableUri;
        }
      );

      return hasDownloadableUri;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Error verifying first Zora mint (attempt ${attempt}/${MAX_RETRIES}) for address ${address}:`,
        error
      );

      if (attempt === MAX_RETRIES) {
        break;
      }

      const retryDelay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      await sleep(retryDelay);
    }
  }

  console.error(
    `Failed to verify first Zora mint after ${MAX_RETRIES} attempts for address ${address}: ${lastError?.message}`
  );
  return false;
}
