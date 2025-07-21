import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const BALANCER_ROUTER =
  "0xBA12222222228d8Ba445958a75a0704d566BF2C8".toLowerCase();
const SWAP_METHOD = "0x945bcec9";

const ETHERSCAN_API = "https://api.etherscan.io/v2/api";
const API_KEY = process.env.BASE_SCAN_API_KEY_02;

type Tx = { to?: string; methodId?: string };

async function hasTenBalancerSwaps(address: Address): Promise<boolean> {
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
    // Count txs to the router
    const count = (data.result as Tx[]).filter(
      (tx) =>
        tx.to?.toLowerCase() === BALANCER_ROUTER &&
        tx.methodId?.toLowerCase() === SWAP_METHOD.toLowerCase()
    ).length;
    return count >= 10;
  } catch (error) {
    console.error("Error verifying Balancer swaps (10x):", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify Balancer swaps: ${
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
    const mint_eligibility = await hasTenBalancerSwaps(address as Address);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });
    return new Response(JSON.stringify({ mint_eligibility, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing GET request (10x):", {
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
