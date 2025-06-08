import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Major Superchain networks (OP Stack chains) from the supported chain list - Using 4 mainnet networks only
const SUPERCHAIN_NETWORKS = {
  optimism: {
    name: "OP Mainnet",
    apiUrl: "https://api.etherscan.io/v2/api",
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: 10,
  },
  base: {
    name: "Base Mainnet",
    apiUrl: "https://api.etherscan.io/v2/api",
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: 8453,
  },
  world: {
    name: "World Mainnet",
    apiUrl: "https://api.etherscan.io/v2/api",
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: 480,
  },
  unichain: {
    name: "Unichain Mainnet",
    apiUrl: "https://api.etherscan.io/v2/api",
    apiKey: process.env.ETHERSCAN_API_KEY,
    chainId: 130,
  },
} as const;

interface NetworkTransaction {
  network: string;
  hasTransactions: boolean;
  transactionCount: number;
  error?: string;
}

async function fetchNetworkTransactions(
  address: Address,
  network: string,
  apiUrl: string,
  apiKey?: string,
  chainId?: number
): Promise<NetworkTransaction> {
  try {
    // Use V2 API format with chainid parameter
    const url = apiKey
      ? `${apiUrl}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${apiKey}`
      : `${apiUrl}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc`;

    const response = await fetch(url);
    const data = await response.json();

    let hasTransactions = false;
    let transactionCount = 0;

    if (data.status === "1" && Array.isArray(data.result)) {
      hasTransactions = data.result.length > 0;
      transactionCount = data.result.length;
    } else if (
      data.status === "0" &&
      data.message === "No transactions found"
    ) {
      hasTransactions = false;
      transactionCount = 0;
    } else {
      throw new Error(`API error: ${data.message || "Unknown error"}`);
    }

    return {
      network,
      hasTransactions,
      transactionCount,
    };
  } catch (error) {
    console.error(`Error fetching ${network} transactions:`, error);
    return {
      network,
      hasTransactions: false,
      transactionCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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

    const mint_eligibility = await verifyL2Voyager(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        signature,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
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

async function verifyL2Voyager(address: Address): Promise<boolean> {
  try {
    console.log("Checking Superchain activity for address:", address);

    const networkPromises = Object.entries(SUPERCHAIN_NETWORKS).map(
      ([, config]) =>
        fetchNetworkTransactions(
          address,
          config.name,
          config.apiUrl,
          config.apiKey,
          config.chainId
        )
    );

    const networkResults = await Promise.all(networkPromises);
    const activeNetworks = networkResults.filter(
      (result) => result.hasTransactions && !result.error
    );

    const activeNetworkCount = activeNetworks.length;
    const isVoyager = activeNetworkCount >= 3;

    console.log(
      `Address ${address} is active on ${activeNetworkCount} Superchain networks`
    );

    return isVoyager;
  } catch (error) {
    console.error("Error verifying Superchain Voyager status:", error);
    throw new Error(
      `Failed to verify Superchain Voyager status: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
