import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";
import { verifyMultipleWallets } from "@/app/lib/multiWalletVerifier";

const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_01;

interface BaseScanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  input: string;
  methodId: string;
  functionName: string;
  contractAddress: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
}

interface BaseScanResponse {
  status: string;
  message: string;
  result: BaseScanTransaction[];
}

async function verifyDeFiTrades(address: Address): Promise<[boolean, string]> {
  try {
    if (!BASESCAN_API_KEY) {
      console.error("Missing required BaseScan API key");
      return [false, "0"];
    }

    console.log(`[DEBUG] Fetching transactions for address: ${address}`);

    // Fetch transaction history from BaseScan API
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = (await response.json()) as BaseScanResponse;

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching transaction data from BaseScan:", data);
      return [false, "0"];
    }

    const transactions = data.result;
    console.log(`[DEBUG] Total transactions found: ${transactions.length}`);

    if (transactions.length === 0) {
      return [false, "0"];
    }

    // DEX contract addresses on Base
    const dexAddresses = [
      // Aerodrome
      "0x420dd381b31aef6683db6b902084cb0ffece40da", // Pool Factory

      // Uniswap
      "0x8909dc15e40173ff4699343b6eb8132c65e18ec6", // V2 Factory
      "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24", // Universal Router
      "0x2626664c2603336e57b271c5c0b26f421741e481", // V3 Router

      // BaseSwap
      "0xfda619b6d20975be80a10332cd39b9a4b0faa8bb", // V2 Factory
      "0x327df1e6de05895d2ab08513aadd9313fe505d86", // Router

      // Curve Finance
      "0x4f37a9d177470499a2dd084621020b023fcffc1f", // Router

      // Additional common router addresses
      "0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch
      "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x Protocol
    ].map((addr) => addr.toLowerCase());

    // Common swap function signatures
    const swapFunctionSignatures = [
      "0x38ed1739", // swapExactTokensForTokens
      "0x18cbafe5", // swapExactTokensForETH
      "0x7ff36ab5", // swapExactETHForTokens
      "0x8803dbee", // swapTokensForExactTokens
      "0x4a25d94a", // swapTokensForExactETH
      "0xfb3bdb41", // swapETHForExactTokens
      "0x022c0d9f", // swap (Uniswap V2 pair)
      "0x128acb08", // swap (Uniswap V3)
      "0x414bf389", // exactInputSingle (Uniswap V3)
      "0xdb3e2198", // exactInput (Uniswap V3)
      "0x5ae401dc", // multicall (Universal Router)
      "0xac9650d8", // multicall (generic)
      "0x3593564c", // execute (Universal Router)
      "0x12aa3caf", // exchange (Curve)
      "0xa6417ed6", // exchange_underlying (Curve)
    ];

    let tradeCount = 0;
    const uniqueTradeHashes = new Set<string>();

    // Analyze transactions for trading activity
    for (const tx of transactions) {
      // Only count transactions initiated by the address
      if (tx.from.toLowerCase() !== address.toLowerCase()) {
        continue;
      }

      const toAddress = tx.to?.toLowerCase();
      const input = tx.input.toLowerCase();
      const methodId = input.slice(0, 10);

      // Check if transaction is to a known DEX contract
      const isDexContract = dexAddresses.includes(toAddress || "");

      // Check if transaction uses a known swap function
      const isSwapFunction = swapFunctionSignatures.includes(methodId);

      // Check for swap-related patterns in function names
      const functionName = tx.functionName?.toLowerCase() || "";
      const hasSwapInName =
        functionName.includes("swap") ||
        functionName.includes("exchange") ||
        functionName.includes("trade") ||
        functionName.includes("exact");

      // Count as a trade if it meets our criteria
      if (
        (isDexContract || isSwapFunction || hasSwapInName) &&
        tx.isError === "0" && // Only successful transactions
        !uniqueTradeHashes.has(tx.hash)
      ) {
        // Avoid counting duplicates
        uniqueTradeHashes.add(tx.hash);
        tradeCount++;
      }
    }

    console.log(`[DEBUG] Total trades found: ${tradeCount}`);
    // Check if the address has made at least 30 trades
    const isEligible = tradeCount >= 30;
    return [isEligible, tradeCount.toString()];
  } catch (error) {
    console.error("Error verifying DeFi trades:", {
      error,
      address,
      timestamp: new Date().toISOString(),
    });
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

    const result = await verifyMultipleWallets(req, verifyDeFiTrades);
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility: result.mint_eligibility,
      data: result.data || "0",
    });

    return new Response(
      JSON.stringify({
        mint_eligibility: result.mint_eligibility,
        data: parseInt(result.data || "0"),
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
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
