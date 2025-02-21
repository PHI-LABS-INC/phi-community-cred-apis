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
    const hasKaitoToken = await verifyKaitoToken(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: hasKaitoToken,
    });

    return new Response(
      JSON.stringify({ mint_eligibility: hasKaitoToken, signature }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in handler:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Verifies if an address holds Kaito tokens
 *
 * @param address - Ethereum address to check
 * @returns boolean eligibility status
 * @throws Error if verification fails
 */

async function verifyKaitoToken(address: Address): Promise<boolean> {
  try {
    // Define the Kaito token contract address
    const KAITO_CONTRACT = "0x98d0baa52b2D063E780DE12F615f963Fe8537553";

    // Query Base blockchain API for Kaito token balance using balanceOf method
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${KAITO_CONTRACT}&address=${address}&apikey=${process.env.BASE_SCAN_API_KEY_02}`
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
      return false;
    }

    // Determine if the address holds Kaito tokens
    const balance = parseFloat(data.result) > 0;

    return balance;
  } catch (error) {
    console.error("Error verifying Kaito token:", error);
    throw new Error("Failed to verify Kaito token ownership");
  }
}
