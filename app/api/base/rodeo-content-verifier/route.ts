import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";

// Configuration
const RODEO_GRAPHQL_API = "https://api-v2.foundation.app/electric/v2/graphql";

/**
 * Verifies if an address owns or created content on Rodeo.club using GraphQL
 * @param address - Ethereum address to check
 * @returns {Promise<[boolean, number]>} - Tuple containing eligibility status and total content count
 */
async function verifyRodeoContent(
  address: Address
): Promise<[boolean, number]> {
  try {
    const collectedQuery = `
      query CollectedTokens($address: Address!, $page: Int, $perPage: Limit) {
        collectedTokens(accountAddress: $address, page: $page, perPage: $perPage) {
          totalItems
        }
      }
    `;

    const createdQuery = `
      query CreatedTokens($address: Address!, $page: Int, $perPage: Limit) {
        createdTokens(accountAddress: $address, page: $page, perPage: $perPage) {
          totalItems
        }
      }
    `;

    const variables = {
      address: address,
      page: 0,
      perPage: 100,
    };

    const [collectedResponse, createdResponse] = await Promise.all([
      fetch(RODEO_GRAPHQL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: collectedQuery,
          variables,
          operationName: "CollectedTokens",
        }),
      }),
      fetch(RODEO_GRAPHQL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: createdQuery,
          variables,
          operationName: "CreatedTokens",
        }),
      }),
    ]);

    if (!collectedResponse.ok || !createdResponse.ok) {
      console.error(
        "Error fetching Rodeo data:",
        `Collected: ${collectedResponse.statusText}, Created: ${createdResponse.statusText}`
      );
      return [false, 0];
    }

    const [collectedData, createdData] = await Promise.all([
      collectedResponse.json(),
      createdResponse.json(),
    ]);

    if (collectedData.errors || createdData.errors) {
      console.error("GraphQL query errors:", {
        collected: collectedData.errors,
        created: createdData.errors,
      });
      return [false, 0];
    }

    const collectedCount = collectedData.data.collectedTokens.totalItems;
    const createdCount = createdData.data.createdTokens.totalItems;
    const totalCount = collectedCount + createdCount;

    return [totalCount > 0, totalCount];
  } catch (error) {
    console.error("Error verifying Rodeo content:", error);
    throw new Error("Failed to verify Rodeo content ownership.");
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

    // Get verification results
    const [mint_eligibility, totalCount] = await verifyRodeoContent(
      address as Address
    );

    // Generate signature
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: totalCount.toString(),
    });

    // Return structured response
    return new Response(
      JSON.stringify({
        mint_eligibility,
        data: totalCount.toString(),
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
