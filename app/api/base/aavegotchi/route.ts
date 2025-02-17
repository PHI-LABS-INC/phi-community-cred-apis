import { NextRequest } from "next/server";
import { Address, isAddress, formatUnits } from "viem";
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
    const [mint_eligibility] = await verifyGhstToken(address as Address);

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(JSON.stringify({ mint_eligibility, signature }), {
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
 * Verifies if an address holds GHST tokens
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string balance]
 * @throws Error if verification fails
 */

async function verifyGhstToken(address: Address): Promise<[boolean, string]> {
  try {
    // Define the GHST token contract address
    const GHST_CONTRACT = "0xcD2F22236DD9Dfe2356D7C543161D4d260FD9BcB";

    // Query Base blockchain API for GHST token balance using balanceOf method
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${GHST_CONTRACT}&address=${address}&apikey=${process.env.BASE_SCAN_API_KEY_03}`
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

    // Use viem's formatUnits to safely handle the balance
    const balance = formatUnits(BigInt(data.result), 18);
    const isEligible = parseFloat(balance) > 0;

    return [isEligible, balance];
  } catch (error) {
    console.error("Error verifying GHST token:", error);
    throw new Error("Failed to verify GHST token ownership");
  }
}
