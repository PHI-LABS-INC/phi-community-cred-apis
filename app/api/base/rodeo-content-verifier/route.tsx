import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";

// Configuration
const RODEO_GRAPHQL_API = "https://api-v2.foundation.app/electric/v2/graphql";

/**
 * Verifies if an address owns content on Rodeo.club using GraphQL
 * @param address - Ethereum address to check
 * @returns {Promise<[boolean, number]>} - Returns if owns content and count
 */
async function ownsRodeoContent(address: Address): Promise<[boolean, number]> {
  const query = `
    query CollectedTokens($address: Address!, $page: Int, $perPage: Limit) {
      collectedTokens(accountAddress: $address, page: $page, perPage: $perPage) {
        items {
          tokenId
          contractAddress
          creator {
            wallet {
              address
            }
          }
          name
        }
        totalItems
      }
    }
  `;

  const variables = {
    address: address,
    page: 0,
    perPage: 100, // Get up to 100 tokens to count them
  };

  try {
    const response = await fetch(RODEO_GRAPHQL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
        operationName: "CollectedTokens",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `GraphQL request failed with status ${
          response.status
        }: ${await response.text()}`
      );
    }

    const data = await response.json();

    if (data.errors) {
      console.error(
        "GraphQL response errors:",
        JSON.stringify(data.errors, null, 2)
      );
      throw new Error(
        `GraphQL errors: ${data.errors[0]?.message || "Unknown GraphQL error"}`
      );
    }

    // Check if the collected tokens items are returned
    if (!data?.data?.collectedTokens?.items) {
      console.warn(
        "Unexpected GraphQL response structure:",
        JSON.stringify(data, null, 2)
      );
      return [false, 0];
    }

    const tokenCount = data.data.collectedTokens.totalItems;
    return [tokenCount > 0, tokenCount];
  } catch (error) {
    console.error("Error checking Rodeo content:", error);
    if (error instanceof Error) {
      throw new Error(
        `Failed to verify Rodeo content ownership: ${error.message}`
      );
    }
    throw new Error("Failed to verify Rodeo content ownership: Unknown error");
  }
}

/**
 * Verifies if an address has content on Rodeo.club
 * @param address - Ethereum address
 * @returns {Promise<[boolean, string]>} - Eligibility and data for signature
 */
async function verifyRodeoEligibility(
  address: Address
): Promise<[boolean, string]> {
  try {
    const [ownsContent, tokenCount] = await ownsRodeoContent(address);

    const isEligible = ownsContent;
    const data = `${tokenCount} total items`;

    return [isEligible, data];
  } catch (error) {
    console.error("Error in eligibility verification:", error);
    throw error;
  }
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

    // Verify address eligibility
    const [eligibility, data] = await verifyRodeoEligibility(
      address as Address
    );

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: eligibility,
      data,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: eligibility,
        data,
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
