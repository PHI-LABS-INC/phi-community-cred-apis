import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

async function verifyTransactionCount(address: Address): Promise<boolean> {
  try {
    const txCount = await client.getTransactionCount({ address });
    return txCount >= 100;
  } catch (error) {
    console.error("Error verifying transaction count:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify transaction count: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const addresses = req.nextUrl.searchParams.get("addresses");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  try {
    const addressesToCheck: Address[] = [address as Address];
    if (addresses) {
      const additionalAddresses = addresses
        .split(",")
        .map((addr) => addr.trim())
        .filter((addr) => isAddress(addr)) as Address[];
      addressesToCheck.push(...additionalAddresses);
    }

    let mint_eligibility = false;
    let data = "0";

    for (const addr of addressesToCheck) {
      try {
        const eligible = await verifyTransactionCount(addr);
        if (eligible) {
          mint_eligibility = true;
          const txCount = await client.getTransactionCount({ address: addr });
          data = txCount.toString();
          break; // Found eligible address, no need to check others
        }
      } catch (error) {
        console.warn(`Error checking address ${addr}:`, error);
        // Continue to next address instead of failing entirely
      }
    }

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility,
      data,
    });

    return NextResponse.json(
      { mint_eligibility, data, signature },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing GET request:", {
      error,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Please try again later" },
      { status: 500 }
    );
  }
}
