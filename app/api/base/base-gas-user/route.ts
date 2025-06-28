import { NextRequest } from "next/server";
import { Address } from "viem";
import { isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyGasSpent(address: Address): Promise<boolean> {
  try {
    const BASESCAN_API_URL = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=asc`;
    const response = await fetch(BASESCAN_API_URL);
    const data = await response.json();

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching Base transactions:", data);
      throw new Error("Failed to fetch transactions from BaseScan");
    }

    let totalGasSpent = BigInt(0);
    for (const tx of data.result) {
      // Only include transactions where the sender is the provided address
      if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
        const gasUsed = BigInt(tx.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        totalGasSpent += gasUsed * gasPrice;
      }
    }
    console.log("Total gas spent:", totalGasSpent);

    // Define the threshold: 0.1 ETH in wei
    const threshold = BigInt("10000000000000000000000");
    return totalGasSpent >= threshold;
  } catch (error) {
    console.error("Error verifying gas spent on Base:", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");

    if (!address || !isAddress(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await verifyMultipleWalletsSimple(req, verifyGasSpent);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: result.mint_eligibility, signature }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in Base gas verification handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
