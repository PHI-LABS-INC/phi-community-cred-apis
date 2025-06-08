import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Snapshot GraphQL API endpoint
const SNAPSHOT_GRAPHQL_URL = "https://hub.snapshot.org/graphql";

interface SnapshotVote {
  id: string;
  voter: string;
  created: number;
  proposal: {
    id: string;
    title: string;
    space: {
      id: string;
      name: string;
    };
  };
}

interface SnapshotResponse {
  data: {
    votes: SnapshotVote[];
  };
}

async function fetchSnapshotVotes(address: Address): Promise<SnapshotVote[]> {
  try {
    const query = `
      query GetVotes($voter: String!) {
        votes(
          where: { voter: $voter }
          first: 10
          orderBy: "created"
          orderDirection: desc
        ) {
          id
          voter
          created
          proposal {
            id
            title
            space {
              id
              name
            }
          }
        }
      }
    `;

    const response = await fetch(SNAPSHOT_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          voter: address.toLowerCase(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Snapshot API error: ${response.status}`);
    }

    const data: SnapshotResponse = await response.json();

    if (!data.data?.votes) {
      return [];
    }

    return data.data.votes;
  } catch (error) {
    console.error("Error fetching Snapshot votes:", error);
    throw new Error(
      `Failed to fetch Snapshot votes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function verifySnapshotVoting(address: Address): Promise<boolean> {
  try {
    console.log("Checking Snapshot voting activity for address:", address);

    const votes = await fetchSnapshotVotes(address);
    const voteCount = votes.length;
    const hasVoted = voteCount >= 1;

    console.log(`Address ${address} has ${voteCount} votes on Snapshot`);

    return hasVoted;
  } catch (error) {
    console.error("Error verifying Snapshot voting:", error);
    throw new Error(
      `Failed to verify Snapshot voting: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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

    const mint_eligibility = await verifySnapshotVoting(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
