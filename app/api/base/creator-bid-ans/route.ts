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
    const [mint_eligibility, data] = await verifyANS(address as Address);

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
 * Verifies if an address owns tokens from the specified contract
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string token balance]
 * @throws Error if verification fails
 */
async function verifyANS(address: Address): Promise<[boolean, string]> {
  try {
    // Define the contract address
    const CONTRACT_ADDRESS = "0x6623206875C37bcEcF67c362d4dd1c96bD5C34d8";

    // Query Base blockchain API for token balance using balanceOf method
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${CONTRACT_ADDRESS}&address=${address}&apikey=${process.env.BASE_SCAN_API_KEY}`
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
    console.error("Error verifying token ownership:", error);
    throw new Error("Failed to verify token ownership");
  }
}
