import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const VE_BAL_LOCK_CONTRACT = "0xC128a9954e6c874eA3d62ce62B468bA073093F25";
const LOCK_METHOD = "0x65fc3873";
const ETHERSCAN_API = "https://api.etherscan.io/api";
const API_KEY = process.env.ETHERSCAN_API_KEY;

type Tx = { to?: string; methodId?: string };

async function hasLockedVeBal(address: Address): Promise<boolean> {
  if (!API_KEY) {
    throw new Error("Missing ETHERSCAN API key");
  }
  const url = `${ETHERSCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(
        `Etherscan API request failed with status ${resp.status}`
      );
    }
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
    return (data.result as Tx[]).some(
      (tx) =>
        tx.to?.toLowerCase() === VE_BAL_LOCK_CONTRACT.toLowerCase() &&
        tx.methodId?.toLowerCase() === LOCK_METHOD.toLowerCase()
    );
  } catch (error) {
    console.error("Error verifying veBAL lock:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify veBAL lock: ${
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
    const mint_eligibility = await hasLockedVeBal(address as Address);
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
