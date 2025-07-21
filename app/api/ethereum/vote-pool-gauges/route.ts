import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

// Ethereum mainnet Pool Gauges contract
const POOL_GAUGES_CONTRACT = "0xC128468b7Ce63eA702C1f104D55A2566b13D3ABD";
const VOTE_METHOD = ["0x2e4e99a1", "0xd7136328"];

const ETHERSCAN_API = "https://api.etherscan.io/api";
const API_KEY = process.env.ETHERSCAN_API_KEY;

type Tx = { to?: string; methodId?: string };

async function hasVotedOnPoolGauges(address: Address): Promise<boolean> {
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
        tx.to?.toLowerCase() === POOL_GAUGES_CONTRACT.toLowerCase() &&
        VOTE_METHOD.some(
          (method) => tx.methodId?.toLowerCase() === method.toLowerCase()
        )
    );
  } catch (error) {
    console.error("Error verifying pool gauge vote:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to verify pool gauge vote: ${
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
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "ETHERSCAN API key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const mint_eligibility = await hasVotedOnPoolGauges(address as Address);
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
