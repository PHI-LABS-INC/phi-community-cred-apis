import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { hasContractInteraction } from "@/app/lib/smart-wallet";

// EigenLayer StrategyManager contract for rETH deposits
const EIGENLAYER_STRATEGY_MANAGER =
  "0x858646372cc42e1a627fce94aa7a7033e7cf075a" as Address;

// Method ID for deposit function (deposit(address,uint256,address,address))
// This is the method ID for the deposit function in EigenLayer's StrategyManager
const DEPOSIT_METHOD_ID = "0xe7a050aa";

async function hasDepositedRethToEigenLayer(
  address: Address
): Promise<boolean> {
  try {
    // Check if the address has interacted with EigenLayer's StrategyManager
    // using the deposit method for rETH
    return await hasContractInteraction(
      address,
      EIGENLAYER_STRATEGY_MANAGER,
      [DEPOSIT_METHOD_ID], // Specific method ID for deposit
      1, // At least 1 interaction
      1 // Ethereum mainnet
    );
  } catch (error) {
    console.error("Error verifying EigenLayer rETH deposit:", error);
    throw new Error("Failed to verify EigenLayer rETH deposit");
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

    // Get verification result
    const mint_eligibility = await hasDepositedRethToEigenLayer(
      address as Address
    );

    console.log("mint_eligibility", mint_eligibility);

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
