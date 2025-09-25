import { NextRequest, NextResponse } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getEOATransactions, isContractAddress } from "@/app/lib/smart-wallet";

/**
 * Get the first transaction for an address using Etherscan API with ascending order
 */
async function getFirstTransaction(
  address: Address
): Promise<{ blockNumber: string } | null> {
  try {
    const apiKeys = [
      process.env.ETHERSCAN_API_KEY,
      process.env.ETHERSCAN_API_KEY2,
      process.env.ETHERSCAN_API_KEY3,
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      throw new Error("No Etherscan API keys available");
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&page=1&offset=1&sort=asc&apikey=${apiKey}`;

    console.log(`[etherscan] Fetching first transaction for ${address}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch first transaction: ${response.statusText}`
      );
    }

    const data = (await response.json()) as {
      status: string;
      message: string;
      result: Array<{ blockNumber: string }>;
    };

    if (data.status === "1" && data.result && data.result.length > 0) {
      return data.result[0];
    }

    return null;
  } catch (error) {
    console.error("Error fetching first transaction:", error);
    return null;
  }
}

async function verifyEthereumOG2016(
  address: Address
): Promise<[boolean, string]> {
  try {
    // Check if address is a contract first
    const isContract = await isContractAddress(address, 1);

    if (isContract) {
      console.log(
        `Address ${address} is a smart contract, using GraphQL approach`
      );
      // For smart contracts, use the existing getTransactions approach
      const transactions = await getEOATransactions(address, 1);

      if (transactions && transactions.length > 0) {
        const sortedTxs = transactions.sort(
          (a, b) => parseInt(a.blockNumber) - parseInt(b.blockNumber)
        );

        const firstTx = sortedTxs[0];
        const blockNumber = parseInt(firstTx.blockNumber);
        const isOG2016 = blockNumber <= 2912406;

        console.log(
          `Smart contract ${address} first transaction block: ${firstTx.blockNumber} (${blockNumber}), 2016 threshold: 2912406, 2016 status: ${isOG2016}`
        );

        return [isOG2016, firstTx.blockNumber];
      }
    } else {
      console.log(`Address ${address} is an EOA, using direct Etherscan call`);
      // For EOA addresses, use direct Etherscan call with ascending order to get the first transaction
      const firstTx = await getFirstTransaction(address);

      if (firstTx) {
        const blockNumber = parseInt(firstTx.blockNumber);
        const isOG2016 = blockNumber <= 2912406;

        console.log(
          `EOA ${address} first transaction block: ${firstTx.blockNumber} (${blockNumber}), 2016 threshold: 2912406, 2016 status: ${isOG2016}`
        );

        return [isOG2016, firstTx.blockNumber];
      }
    }

    console.log(`Address ${address} has no transactions found`);
    return [false, "0"];
  } catch (error) {
    console.error("Error verifying Ethereum OG 2016 status:", {
      error: error instanceof Error ? error.message : String(error),
      address,
    });
    return [false, "0"];
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
    let mint_eligibility = false;
    let data = "0";

    try {
      const [eligible, blockNumber] = await verifyEthereumOG2016(
        address as Address
      );
      mint_eligibility = eligible;
      data = blockNumber;
    } catch (error) {
      console.warn(`Error checking address ${address}:`, error);
    }

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
