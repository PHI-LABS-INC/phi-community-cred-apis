import { createSignature } from "@/app/lib/signature";
import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";

// Configuration
const RODEO_GRAPHQL_API = "https://api-v2.foundation.app/electric/v2/graphql";

/**
 * Verifies if an address owns or created content on Rodeo.club using GraphQL
 * @param address - Ethereum address to check
 * @returns {Promise<[boolean, string]>} - Returns if owns or created content and count
 */
async function verifyRodeoContent(
  address: Address
): Promise<[boolean, string]> {
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
      throw new Error("Failed to fetch Rodeo content data");
    }

    const [collectedData, createdData] = await Promise.all([
      collectedResponse.json(),
      createdResponse.json(),
    ]);

    if (collectedData.errors || createdData.errors) {
      throw new Error("GraphQL query failed");
    }

    const collectedCount = collectedData.data.collectedTokens.totalItems;
    const createdCount = createdData.data.createdTokens.totalItems;
    const totalCount = collectedCount + createdCount;

    const isEligible = totalCount > 0;
    return [isEligible, totalCount.toString()];
  } catch (error) {
    console.error("Error verifying Rodeo content:", error);
    throw new Error("Failed to verify Rodeo content ownership");
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
    const [mint_eligibility, data] = await verifyRodeoContent(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: data.toString(),
    });

    return new Response(
      JSON.stringify({ mint_eligibility, data: data.toString(), signature }),
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
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
}
