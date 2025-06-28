import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

async function verifyTokenApprovalRevocation(
  address: Address
): Promise<[boolean, string]> {
  try {
    const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_02;

    if (!BASESCAN_API_KEY) {
      console.error("Missing BaseScan API key");
      return [false, "0"];
    }

    // Use BaseScan API to get transactions for Base network (chainid=8453)
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${BASESCAN_API_KEY}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === "0" && data.message === "NOTOK") {
      console.error("BaseScan API error:", data.result);
      return [false, "0"];
    }

    if (
      !data.result ||
      !Array.isArray(data.result) ||
      data.result.length === 0
    ) {
      return [false, "0"];
    }

    const transactions = data.result;
    let revocationCount = 0;

    // Check each transaction for approval revocation patterns
    for (const tx of transactions) {
      if (!tx.input || tx.input === "0x") continue;

      const input = tx.input.toLowerCase();

      // Check for approve(address,uint256) with value 0 (revocation)
      if (input.startsWith("0x095ea7b3")) {
        // approve(address,uint256) function signature
        // Input format: 0x095ea7b3 + 32 bytes (spender address) + 32 bytes (value)
        if (input.length >= 138) {
          // 10 chars (0x + method) + 128 chars (64 + 64)
          const amountHex = input.slice(74, 138); // Extract the value parameter (last 32 bytes)

          // Convert to BigInt, handling potential parsing errors
          try {
            const amount = BigInt("0x" + amountHex);

            // If amount is 0, it's a revocation
            if (amount === BigInt(0)) {
              revocationCount++;
              console.log(
                `Found approval revocation in tx ${tx.hash}: amount = 0`
              );
            }
          } catch (error) {
            console.warn(
              `Failed to parse amount from tx ${tx.hash}:`,
              amountHex,
              error
            );
          }
        }
      }

      // Check for setApprovalForAll(address,bool) with false (revocation)
      if (input.startsWith("0xa22cb465")) {
        // setApprovalForAll(address,bool) function signature
        // Input format: 0xa22cb465 + 32 bytes (operator address) + 32 bytes (approved boolean)
        if (input.length >= 138) {
          // 10 chars (0x + method) + 128 chars (64 + 64)
          const boolHex = input.slice(74, 138); // Extract the approved parameter (last 32 bytes)

          // Convert to BigInt, handling potential parsing errors
          try {
            const boolValue = BigInt("0x" + boolHex);

            // If boolean is 0 (false), it's a revocation
            if (boolValue === BigInt(0)) {
              revocationCount++;
              console.log(
                `Found setApprovalForAll revocation in tx ${tx.hash}: approved = false`
              );
            }
          } catch (error) {
            console.warn(
              `Failed to parse boolean from tx ${tx.hash}:`,
              boolHex,
              error
            );
          }
        }
      }
    }

    const isEligible = revocationCount > 0;

    console.log(
      `Address ${address} has revoked ${revocationCount} token approvals on Base, eligible: ${isEligible}`
    );

    return [isEligible, revocationCount.toString()];
  } catch (error) {
    console.error("Error verifying token approval revocation on Base:", error);
    return [false, "0"];
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

    const result = await verifyMultipleWallets(
      req,
      verifyTokenApprovalRevocation
    );

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
      data: result.data || "0",
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
        data: result.data || "0",
        signature,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
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
