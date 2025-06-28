import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyEthWhale(address: Address): Promise<boolean> {
  try {
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

    if (!ETHERSCAN_API_KEY) {
      console.error("Missing Etherscan API key");
      return false;
    }

    // Use Etherscan API to get the ETH balance
    const apiUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === "1" && data.result) {
      // Balance is returned in wei, convert to ETH
      const balanceInWei = BigInt(data.result);
      const balanceInEth = Number(balanceInWei) / 1e18;

      // Check if balance is at least 10 ETH
      return balanceInEth >= 10;
    }

    return false;
  } catch (error) {
    console.error("Error verifying ETH whale:", {
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

    const { mint_eligibility } = await verifyMultipleWalletsSimple(
      req,
      verifyEthWhale
    );

    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
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
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
