import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWalletsSimple } from "@/app/lib/multiWalletVerifier";

async function verifyDelegateCaller(address: Address): Promise<boolean> {
  try {
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      console.error("ETHERSCAN_API_KEY not found");
      return false;
    }

    console.log(`Checking if ${address} has made delegate calls`);

    // Get all transactions from this address
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=latest&sort=desc&apikey=${etherscanApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Etherscan:", response.statusText);
      return false;
    }

    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      // Look for delegate call patterns
      // Delegate calls are often identified by empty 'to' field or specific contract interactions
      const delegateCallTransactions = data.result.filter(
        (tx: {
          to?: string;
          value: string;
          isError: string;
          input: string;
          functionName?: string;
          methodId?: string;
        }) => {
          // Check for delegate call patterns
          // 1. Transactions with specific delegate call method IDs
          if (tx.input && tx.input.startsWith("0x")) {
            const methodId = tx.input.slice(0, 10); // First 4 bytes (8 hex chars + 0x)

            // Common delegate call method IDs
            const delegateCallMethodIds = [
              "0x5c60da1b", // delegatecall()
              "0xddc3e0d3", // delegateCallWithSignature()
              "0xa619486e", // masterCopy delegate selector
              "0x8dd14802", // Gnosis safe delegate calls
              "0x1626ba7e", // isValidSignature - often used in delegate calls
              "0x1688f0b9", // execTransaction - often delegates
              "0x6a761202", // execTransactionFromModule
              "0x468721a7", // execTransactionFromModuleReturnData
            ];

            if (delegateCallMethodIds.includes(methodId)) {
              return tx.isError === "0"; // Only successful transactions
            }
          }

          // 2. Look for specific function names that indicate delegate calls
          if (tx.functionName) {
            const delegateFunctions = [
              "delegateCall",
              "delegatecall",
              "execTransaction",
              "execTransactionFromModule",
              "delegateCallWithSignature",
            ];

            const hasDelegate = delegateFunctions.some((func) =>
              tx.functionName!.toLowerCase().includes(func.toLowerCase())
            );

            if (hasDelegate && tx.isError === "0") {
              return true;
            }
          }

          return false;
        }
      );

      if (delegateCallTransactions.length > 0) {
        console.log(
          `Found ${delegateCallTransactions.length} delegate call transactions for address ${address}`
        );
        return true;
      }
    }

    console.log(`No delegate calls found for address ${address}`);
    return false;
  } catch (error) {
    console.error("Error verifying delegate caller status:", error);
    return false;
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

    const { mint_eligibility } = await verifyMultipleWalletsSimple(
      req,
      verifyDelegateCaller
    );

    // Generate cryptographic signature of the verification result
    const signature = await createSignature({
      address: address as Address, // Always use the primary address for signature
      mint_eligibility,
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        signature,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in delegate-caller verifier:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
