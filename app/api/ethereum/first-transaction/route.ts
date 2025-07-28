import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "Invalid address provided" },
      { status: 400 }
    );
  }

  try {
    let result;
    for (let i = 0; i < 3; i++) {
      try {
        result = await verifyTransaction(address as Address);
        break;
      } catch (error) {
        if (i === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    const [mint_eligibility, data] = result!;

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
      { error: "Please try again later" },
      { status: 500 }
    );
  }
}

/**
 * Verifies the first transaction date of an Ethereum address
 *
 * @param address - Ethereum address to check transactions for
 * @returns Tuple containing [boolean eligibility status, string first transaction date]
 * @throws Error if transaction verification fails
 */
async function verifyTransaction(address: Address): Promise<[boolean, string]> {
  try {
    const transactions = await getTransactions(address, 1); // Ethereum mainnet

    if (!transactions || transactions.length === 0) {
      return [false, "No transactions found"];
    }

    // Get the first transaction's timestamp (transactions are sorted by desc, so get the last one)
    const firstTx = transactions[transactions.length - 1];
    const firstTxDate = new Date(parseInt(firstTx.timeStamp || "0") * 1000);

    return [true, firstTxDate.toISOString()];
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw error;
  }
}
