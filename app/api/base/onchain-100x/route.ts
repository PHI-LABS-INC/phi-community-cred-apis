import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyTransactionCount(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Use getTransactions to support both EOAs and smart contract wallets
    const transactions = await getTransactions(address, 8453); // Base chain
    return [transactions.length >= 100, transactions.length.toString()];
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
        .map((addr: string) => addr.trim())
        .filter((addr: string) => isAddress(addr)) as Address[];
      addressesToCheck.push(...additionalAddresses);
    }

    let mint_eligibility = false;
    let data = "0";

    for (const addr of addressesToCheck) {
      try {
        const [eligible, txCount] = await verifyTransactionCount(addr);
        if (eligible) {
          mint_eligibility = true;
          data = txCount;
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
