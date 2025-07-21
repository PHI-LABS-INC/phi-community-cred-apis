import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const USDC_AAVE_V3_POOL = "0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c";
const ETHERSCAN_API = "https://api.etherscan.io/v2/api";
const API_KEY = process.env.BASE_SCAN_API_KEY_02;

type Tx = { to?: string };

async function hasAddedUsdcAaveV3Liquidity(address: Address): Promise<boolean> {
  const url = `${ETHERSCAN_API}?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (
      !data ||
      (data.status === "0" &&
        data.message === "NOTOK" &&
        data.result === "Missing/Invalid API Key")
    ) {
      throw new Error("Missing or invalid API key");
    }
    if (!data.result || !Array.isArray(data.result)) return false;
    // Look for at least one tx to the USDC_AAVE_V3_POOL
    return (data.result as Tx[]).some(
      (tx) => tx.to?.toLowerCase() === USDC_AAVE_V3_POOL.toLowerCase()
    );
  } catch (error) {
    console.error("Error verifying Balancer V3 add liquidity:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Balancer V3 add liquidity: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
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
    const mint_eligibility = await hasAddedUsdcAaveV3Liquidity(
      address as Address
    );
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });
    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
