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

async function verifyNFTCollection(address: Address): Promise<boolean> {
  try {
    if (!BASESCAN_API_KEY) {
      console.error("Missing required BaseScan API key");
      return false;
    }

    // Fetch ERC-721 token transfers (NFTs) for the address
    const erc721Url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokennfttx&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(erc721Url);
    const data = (await response.json()) as BaseScanTokenResponse;

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching NFT transaction data from BaseScan:", data);
      return false;
    }

    const nftTransfers = data.result;
    if (nftTransfers.length === 0) {
      return false;
    }

    // Track unique NFTs received by the address
    const uniqueNFTs = new Set<string>();

    for (const transfer of nftTransfers) {
      // Only count NFTs received by the address (incoming transfers)
      if (transfer.to.toLowerCase() === address.toLowerCase()) {
        // Create unique identifier for each NFT (contract + tokenID)
        const nftId = `${transfer.contractAddress.toLowerCase()}-${
          transfer.tokenID
        }`;
        uniqueNFTs.add(nftId);
      }
    }

    // Check if the address has collected at least 10 unique NFTs
    return uniqueNFTs.size >= 10;
  } catch (error) {
    console.error("Error verifying NFT collection:", {
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

    const mint_eligibility = await verifyNFTCollection(address as Address);
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
