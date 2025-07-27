import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const CURVE_ROUTER_V1_2 = "0x45312ea0eff7e09c83cbe249fa1d7598c4c8cd4e";
const ETHERSCAN_API = "https://api.etherscan.io/api";
const API_KEY = process.env.ETHERSCAN_API_KEY;

type Tx = { to?: string };

async function hasUsedCurveSwap(address: Address): Promise<boolean> {
  const url = `${ETHERSCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data || data.status === "0") {
      return false;
    }

    if (!data.result || !Array.isArray(data.result)) return false;

    // Look for at least one transaction to the CurveRouter v1.2
    return (data.result as Tx[]).some(
      (tx) => tx.to?.toLowerCase() === CURVE_ROUTER_V1_2.toLowerCase()
    );
  } catch (error) {
    console.error("Error verifying Curve swap:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Curve swap: ${
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

    const mint_eligibility = await hasUsedCurveSwap(address as Address);
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
