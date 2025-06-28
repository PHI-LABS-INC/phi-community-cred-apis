import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

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

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  try {
    const result = await verifyMultipleWalletsSimple(
      req,
      verifyTransactionCount
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility: result.mint_eligibility,
    });

    return NextResponse.json(
      { mint_eligibility: result.mint_eligibility, signature },
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
