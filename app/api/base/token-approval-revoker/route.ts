import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { getTransactions } from "@/app/lib/smart-wallet";

async function verifyTokenApprovalRevocation(
  address: Address
): Promise<[boolean, number]> {
  try {
    // Fetch all transactions using getTransactions from smart-wallet.ts
    const transactions = await getTransactions(address, 8453); // Base chain

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

    return [isEligible, revocationCount];
  } catch (error) {
    console.error("Error verifying token approval revocation on Base:", error);
    return [false, 0];
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

    const [mint_eligibility, revocationCount] =
      await verifyTokenApprovalRevocation(address as Address);

    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: revocationCount.toString(),
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        data: revocationCount.toString(),
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
