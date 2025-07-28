import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { isWithinInterval } from "date-fns";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

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
        const [eligible, txCount] = await verifyTransaction(addr);
        // If this address is eligible, mark as eligible and break
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
    console.error("Error in handler:", error);
    return NextResponse.json(
      { error: "Please try again later" },
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
    // Fetch transaction history using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

    // Return default values if no transaction data
    if (transactions.length === 0) {
      return [false, "0"];
    }

    // Define the target time interval (January 2025)
    const targetInterval = {
      start: new Date("2025-01-01T00:00:00Z"),
      end: new Date("2025-01-31T23:59:59Z"),
    };

    // Optimize transaction counting with early return
    let januaryTxCount = 0;
    for (const tx of transactions) {
      if (!tx.timeStamp) continue;
      const txDate = new Date(parseInt(tx.timeStamp) * 1000);
      if (isWithinInterval(txDate, targetInterval)) {
        januaryTxCount++;
        // Early return if we find at least one transaction (since that's all we need)
        if (januaryTxCount >= 1) {
          return [true, januaryTxCount.toString()];
        }
      }
    }

    return [false, "0"];
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw error; // Propagate error for retry logic
  }
}
