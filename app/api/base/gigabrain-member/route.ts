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
    const [mint_eligibility, data] = await verifyGigaBrainHoldings(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: data.length > 32 ? data.slice(0, 32) : data.padEnd(32, "0"),
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
 * Verifies if an address holds either a GigaBrain Pass NFT or at least 1M GigaBrain tokens
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, string data]
 * @throws Error if verification fails
 */
async function verifyGigaBrainHoldings(
  address: Address
): Promise<[boolean, string]> {
  try {
    const GIGABRAIN_TOKEN = "0xCE1eAB31756A48915B7E7bb79C589835aAc6242d";
    const GIGABRAIN_PASS = "0x4b85316c90f9fdfff093bb9029a727fc12e7e5d8";
    const MIN_TOKEN_AMOUNT = 1_000_000; // 1M tokens

    // Check token balance
    const tokenResponse = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${GIGABRAIN_TOKEN}&address=${address}&apikey=${process.env.BASE_SCAN_API_KEY}`
    );
    const tokenData = await tokenResponse.json();

    // Check NFT balance
    const nftResponse = await fetch(
      `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${GIGABRAIN_PASS}&address=${address}&apikey=${process.env.BASE_SCAN_API_KEY}`
    );
    const nftData = await nftResponse.json();

    if (
      !tokenData ||
      !nftData ||
      (tokenData.status === "0" && tokenData.message === "NOTOK") ||
      (nftData.status === "0" && nftData.message === "NOTOK")
    ) {
      throw new Error("API request failed");
    }

    // Format token balance
    const tokenBalance = formatUnits(BigInt(tokenData.result || "0"), 18);
    const hasEnoughTokens = parseFloat(tokenBalance) >= MIN_TOKEN_AMOUNT;

    // Check NFT balance
    const nftBalance = parseInt(nftData.result || "0");
    const hasPass = nftBalance > 0;

    const isEligible = hasEnoughTokens || hasPass;
    const data = JSON.stringify({
      tokenBalance,
      hasPass,
    });

    return [isEligible, data];
  } catch (error) {
    console.error("Error verifying GigaBrain holdings:", error);
    throw new Error("Failed to verify GigaBrain holdings");
  }
}
