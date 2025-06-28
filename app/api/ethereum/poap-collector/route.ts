import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

interface POAPEvent {
  event: {
    id: number;
    name: string;
    description: string;
    city: string;
    country: string;
    start_date: string;
    end_date: string;
    event_url: string;
    image_url: string;
  };
  tokenId: string;
  chain: string;
}

async function verifyPOAPCollector(
  address: Address
): Promise<[boolean, string]> {
  try {
    console.log("Checking POAP collection for address:", address);

    // Use POAP API to get POAPs for the address
    const response = await fetch(
      `https://api.poap.tech/actions/scan/${address}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "phi-community-cred-apis",
        },
      }
    );

    if (!response.ok) {
      console.error(`POAP API error: ${response.status}`);
      return [false, "0"];
    }

    const poaps: POAPEvent[] = await response.json();

    if (!Array.isArray(poaps)) {
      console.log(`No POAPs found for address ${address}`);
      return [false, "0"];
    }

    const poapCount = poaps.length;
    const isCollector = poapCount >= 3; // Must have at least 3 POAPs to be considered a collector

    console.log(`Address ${address} has ${poapCount} POAPs (threshold: 3)`);

    return [isCollector, poapCount.toString()];
  } catch (error) {
    console.error("Error verifying POAP collector status:", error);
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

    const { mint_eligibility, data } = await verifyMultipleWallets(
      req,
      verifyPOAPCollector
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility,
      data: data || "0",
    });

    return new Response(
      JSON.stringify({ mint_eligibility, data: data || "0", signature }),
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
