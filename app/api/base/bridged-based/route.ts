import { NextRequest } from "next/server";
import { Address, isAddress, parseEther } from "viem";
import { createSignature } from "@/app/lib/signature";

const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_01;

interface BaseScanTransaction {
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  timeStamp: string;
  input: string;
  contractAddress: string;
}

interface BaseScanResponse {
  status: string;
  message: string;
  result: BaseScanTransaction[];
}

async function verifyBridgedAmount(address: Address): Promise<boolean> {
  try {
    if (!BASESCAN_API_KEY) {
      console.error("Missing required BaseScan API key");
      return false;
    }

    // Fetch transaction history from BaseScan API
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = (await response.json()) as BaseScanResponse;

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching transaction data from BaseScan:", data);
      return false;
    }

    const transactions = data.result;
    if (transactions.length === 0) {
      return false;
    }

    // Common bridge contract addresses on Base
    const bridgeAddresses = [
      "0x3154cf16ccdb4c6d922629664174b904d80f2c35", // Base Bridge
      "0x49048044d57e1c92a77f79988d21fa8faf74e97e", // Base Portal
      "0x1a0ad011913a150f69f6a19df447a0cfd9551054", // OptimismPortal
      "0x866e82a600a1414e583f7f13623f1ac5d58b0afa", // L1StandardBridge
    ].map((addr) => addr.toLowerCase());

    let totalBridgedValue = BigInt(0);

    // Look for incoming transactions from bridge contracts or deposits
    for (const tx of transactions) {
      const fromAddress = tx.from.toLowerCase();
      const toAddress = tx.to?.toLowerCase();
      const value = BigInt(tx.value);

      // Check if transaction is from a known bridge contract to this address
      if (
        bridgeAddresses.includes(fromAddress) &&
        toAddress === address.toLowerCase() &&
        value > 0
      ) {
        totalBridgedValue += value;
      }

      // Also check for deposit transactions (when the address receives ETH from system)
      if (
        tx.input === "0x" &&
        value > 0 &&
        toAddress === address.toLowerCase()
      ) {
        // This could be a bridge deposit - add to total
        totalBridgedValue += value;
      }
    }

    // Check if total bridged amount is at least 1 ETH
    const oneEth = parseEther("1");
    return totalBridgedValue >= oneEth;
  } catch (error) {
    console.error("Error verifying bridged amount:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    return false;
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

    const mint_eligibility = await verifyBridgedAmount(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
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
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
