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

    const [mint_eligibility] = result!;

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return NextResponse.json({ mint_eligibility, signature }, { status: 200 });
  } catch (error) {
    console.error("Error in handler:", error);
    return NextResponse.json(
      { error: "Please try again later" },
      { status: 500 }
    );
  }
}

/**
 * Checks if the user has done any transaction before block 7710000 (2018).
 *
 * @param address - Ethereum address to check transactions for
 * @returns Tuple containing [boolean eligibility status, string info or first eligible transaction date]
 * @throws Error if transaction verification fails
 */
async function verifyTransaction(address: Address): Promise<[boolean, string]> {
  try {
    // Fetch all transactions for the address (or enough to cover 2018)
    // You may want to implement pagination in getTransactions if needed
    const transactions = await getTransactions(address, 1); // Ethereum mainnet

    if (!transactions || transactions.length === 0) {
      return [false, "No transactions found"];
    }

    // Find the earliest transaction with blockNumber <= 7710000
    let eligibleTx = null;
    for (let i = transactions.length - 1; i >= 0; i--) {
      const tx = transactions[i];
      const blockNumber = parseInt(tx.blockNumber || "0");
      if (!isNaN(blockNumber) && blockNumber <= 7710000) {
        eligibleTx = tx;
        break;
      }
    }

    if (eligibleTx) {
      const eligibleDate = new Date(
        parseInt(eligibleTx.timeStamp || "0") * 1000
      );
      return [true, eligibleDate.toISOString()];
    } else {
      return [false, "No transaction before or at block 7710000 (2018)"];
    }
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw error;
  }
}
