import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { parseISO, isWithinInterval } from "date-fns";
import { createSignature } from "@/app/lib/signature";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  try {
    // Get transaction verification results
    const [mint_eligibility, data] = await verifyTransaction(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return NextResponse.json(
      { mint_eligibility, data, signature },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Verifies if an address has transactions in January 2025
 *
 * @param address - Ethereum address to check transactions for
 * @returns Tuple containing [boolean eligibility status, string transaction count]
 * @throws Error if transaction verification fails
 */
 async function verifyTransaction(address: Address): Promise<[boolean, string]> {
  try {
    // Fetch transaction history from Cyber API
    const response = await fetch(
      `https://api.w3w.ai/cyber/v1/explorer/address/${address}/transactions`
    );

    const data = (await response.json()) as {
      data?: Array<{ block_timestamp: string }>;
    };

    // Return default values if no transaction data
    if (!data || !data.data) {
      return [false, "0"];
    }

    // Define the target time interval (January 2025)
    const targetInterval = {
      start: new Date("2025-01-01T00:00:00Z"),
      end: new Date("2025-01-31T23:59:59Z"),
    };

    // Count transactions within January 2025
    const januaryTxCount = data.data.filter((tx) => {
      const txDate = parseISO(tx.block_timestamp);
      return isWithinInterval(txDate, targetInterval);
    }).length;

    // Determine eligibility (must have at least 1 transaction)
    const isEligible = januaryTxCount >= 1;

    return [isEligible, januaryTxCount.toString()];
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw new Error("Failed to verify address transactions");
  }
}
