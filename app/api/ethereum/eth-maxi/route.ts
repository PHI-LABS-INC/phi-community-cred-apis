import { NextRequest } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

async function verifyTransactionCount(
  address: Address
): Promise<[boolean, string]> {
  try {
    const txCount = await client.getTransactionCount({ address });
    const isEligible = txCount >= 100;
    return [isEligible, txCount.toString()];
  } catch (error) {
    console.error("Error verifying transaction count:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return [false, "0"];
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

    const [mint_eligibility, txCount] = await verifyTransactionCount(
      address as Address
    );
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: txCount,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        data: txCount,
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
