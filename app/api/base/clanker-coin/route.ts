import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

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

    // Get verification results
    const [mint_eligibility, data] = await verifyClankerCoin(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data,
    });

    return new Response(JSON.stringify({ mint_eligibility, data, signature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address has purchased a Clanker coin
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string balance]
 * @throws Error if verification fails
 */

async function verifyClankerCoin(address: Address): Promise<[boolean, string]> {
  try {
    // Define the Clanker coin contract address
    const CLANKER_CONTRACT = "0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb";

    // Query Base blockchain API for Clanker coin balance using balanceOf method
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${CLANKER_CONTRACT}&address=${address}&apikey=${process.env.BASE_SCAN_API_KEY}`
    );

    const data = await response.json();

    if (
      !data ||
      (data.status === "0" &&
        data.message === "NOTOK" &&
        data.result === "Missing/Invalid API Key")
    ) {
      throw new Error("Missing or invalid API key");
    }

    if (!data.result) {
      return [false, "0"];
    }

    const balance = parseInt(data.result);
    const isEligible = balance > 0;

    return [isEligible, balance.toString()];
  } catch (error) {
    console.error("Error verifying Clanker coin:", error);
    throw new Error("Failed to verify Clanker coin ownership");
  }
}
