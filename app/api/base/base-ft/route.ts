import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_02;

interface BaseScanTokenTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  tokenID: string;
}

interface BaseScanTokenResponse {
  status: string;
  message: string;
  result: BaseScanTokenTransaction[];
}

async function verifyNFTHoldings(address: Address): Promise<boolean> {
  try {
    if (!BASESCAN_API_KEY) {
      console.error("Missing required BaseScan API key");
      return false;
    }

    // Fetch current ERC-721 token balances for the address
    const tokenBalanceUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokennfttx&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=desc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(tokenBalanceUrl);
    const data = (await response.json()) as BaseScanTokenResponse;

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching NFT transaction data from BaseScan:", data);
      return false;
    }

    const nftTransfers = data.result;
    if (nftTransfers.length === 0) {
      return false;
    }

    // Track current NFT holdings by contract and token ID
    const currentHoldings = new Map<string, boolean>();

    for (const transfer of nftTransfers) {
      const nftId = `${transfer.contractAddress.toLowerCase()}-${
        transfer.tokenID
      }`;

      if (transfer.to.toLowerCase() === address.toLowerCase()) {
        // NFT was received by the address
        currentHoldings.set(nftId, true);
      } else if (transfer.from.toLowerCase() === address.toLowerCase()) {
        // NFT was sent from the address
        currentHoldings.delete(nftId);
      }
    }

    // Check if the address currently holds more than 10 NFTs
    return currentHoldings.size > 10;
  } catch (error) {
    console.error("Error verifying NFT holdings:", {
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

    const mint_eligibility = await verifyNFTHoldings(address as Address);
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
