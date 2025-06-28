import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import axios, { AxiosError } from "axios";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

// EAS GraphQL endpoint for Base
const EAS_GRAPHQL_ENDPOINT = "https://base.easscan.org/graphql";

// BountyCaster schema IDs
const BOUNTYCASTER_SCHEMA_IDS = [
  "0x080a79410f9c625106db1bd1bd2b83cf2b04b42598d3ec338635c4827692f72f", // Bounty completion schema
];

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
    const result = await verifyMultipleWallets(
      req,
      verifyBountyCasterAttestation
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
      data: result.data,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
        data: result.data,
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

/**
 * Verifies if an address has any valid attestations from BountyCaster
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string attestation data]
 * @throws Error if verification fails
 */
async function verifyBountyCasterAttestation(
  address: Address
): Promise<[boolean, string]> {
  try {
    console.log("Checking attestations for address:", address);

    // Query attestations using GraphQL
    const response = await axios.post(EAS_GRAPHQL_ENDPOINT, {
      query: `
        query GetAttestations($recipient: String!, $schemaIds: [String!]!) {
          attestations(
            where: {
              recipient: { equals: $recipient }
              schemaId: { in: $schemaIds }
              revoked: { equals: false }
            }
            take: 1
            orderBy: { time: desc }
          ) {
            id
            schemaId
            data
            time
          }
        }
      `,
      variables: {
        recipient: address.toLowerCase(),
        schemaIds: BOUNTYCASTER_SCHEMA_IDS,
      },
    });

    console.log("GraphQL response:", JSON.stringify(response.data, null, 2));

    const attestations = response.data.data.attestations;
    console.log("Found attestations:", attestations.length);

    const hasValidAttestation = attestations.length > 0;
    console.log("Has valid attestation:", hasValidAttestation);

    // If there are attestations, get the most recent one's data
    let attestationData = "0";
    if (hasValidAttestation) {
      const latestAttestation = attestations[0];
      attestationData = latestAttestation.data;
      console.log("Latest attestation data:", attestationData);
    }

    return [hasValidAttestation, attestationData];
  } catch (error) {
    console.error("Error verifying BountyCaster attestation:", error);
    if (error instanceof AxiosError && error.response) {
      console.error("GraphQL error response:", error.response.data);
    }
    throw new Error("Failed to verify BountyCaster attestation");
  }
}
