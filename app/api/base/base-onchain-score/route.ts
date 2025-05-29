import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { createSignature } from "@/app/lib/signature";

const BASESCAN_API_KEY = process.env.BASE_SCAN_API_KEY_01;

// Type definitions for BaseScan API response
interface BaseScanTransaction {
  blockHash: string;
  blockNumber: string;
  confirmations: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  from: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  input: string;
  isError: string;
  nonce: string;
  timeStamp: string;
  to: string;
  transactionIndex: string;
  value: string;
}

interface BaseScanResponse {
  status: string;
  message: string;
  result: BaseScanTransaction[];
}

interface TransactionMetrics {
  totalTransactions: number;
  uniqueActiveDays: number;
  longestStreak: number;
  currentStreak: number;
  activityPeriod: number;
  tokenSwaps: number;
  bridgeTransactions: number;
  lendingTransactions: number;
  ensInteractions: number;
  contractDeployments: number;
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

    // Get verification results
    const [mint_eligibility, data] = await verifyOnchainScore(
      address as Address
    );

    // Generate cryptographic signature of the verification results
    const signature = await createSignature({
      address: address as Address,
      mint_eligibility,
      data: data.toString(),
    });

    return new Response(
      JSON.stringify({
        mint_eligibility,
        data,
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

/**
 * Verifies if an address has an onchain score between 50 and 100
 * Score ranges from 0 to 100, where higher scores indicate more onchain activity
 * The score is calculated based on:
 * 1. Transaction Volume (up to 25 points)
 *    - Total transactions
 *    - Token swaps
 *    - Bridge transactions
 * 2. Activity Consistency (up to 25 points)
 *    - Unique active days
 *    - Longest streak
 *    - Current streak
 * 3. Activity Period (up to 25 points)
 *    - How long the address has been active
 * 4. Contract Interactions (up to 25 points)
 *    - Lending/borrowing/staking
 *    - ENS interactions
 *    - Contract deployments
 *
 * @param address - Ethereum address to check
 * @returns Tuple containing [boolean eligibility status, number data]
 */
async function verifyOnchainScore(
  address: Address
): Promise<[boolean, number]> {
  try {
    if (!BASESCAN_API_KEY) {
      console.error("Missing required BaseScan API key");
      return [false, 0];
    }

    // Fetch transaction history from BaseScan API
    const apiUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address.toLowerCase()}&startblock=0&endblock=latest&sort=asc&apikey=${BASESCAN_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = (await response.json()) as BaseScanResponse;

    if (data.status !== "1" || !Array.isArray(data.result)) {
      console.error("Error fetching transaction data from BaseScan:", data);
      return [false, 0];
    }

    const transactions = data.result;
    if (transactions.length === 0) {
      return [false, 0];
    }

    // Calculate detailed metrics
    const metrics = calculateTransactionMetrics(transactions);

    // Calculate score components
    const volumeScore = calculateVolumeScore(metrics);
    const consistencyScore = calculateConsistencyScore(metrics);
    const periodScore = calculatePeriodScore(metrics);
    const interactionScore = calculateInteractionScore(metrics);

    // Calculate total score (0-100)
    const totalScore = Math.min(
      100,
      volumeScore + consistencyScore + periodScore + interactionScore
    );

    // Address is eligible if total score is between 50 and 100
    const isEligible = totalScore > 50 && totalScore <= 100;

    return [isEligible, totalScore];
  } catch (error) {
    console.error("Error verifying onchain reputation score:", error);
    return [false, 0];
  }
}

function calculateTransactionMetrics(
  transactions: BaseScanTransaction[]
): TransactionMetrics {
  const metrics: TransactionMetrics = {
    totalTransactions: transactions.length,
    uniqueActiveDays: 0,
    longestStreak: 0,
    currentStreak: 0,
    activityPeriod: 0,
    tokenSwaps: 0,
    bridgeTransactions: 0,
    lendingTransactions: 0,
    ensInteractions: 0,
    contractDeployments: 0,
  };

  // Track unique days and streaks
  const activeDays = new Set<string>();
  let currentStreak = 0;
  let longestStreak = 0;
  let lastActiveDay: string | null = null;

  // Common contract addresses (you should expand this list)
  const SWAP_ROUTERS: string[] = [
    "0x327df1e6de05895d2ab08513aadd9313fe505d86", // BaseSwap Router
    // Add more swap router addresses
  ];
  const BRIDGE_CONTRACTS: string[] = [
    "0x49048044d57e1c92a77f79988d21fa8faf74e97e", // Base Bridge
    // Add more bridge contract addresses
  ];
  const LENDING_CONTRACTS: string[] = [
    // Add lending protocol addresses
  ];
  const ENS_CONTRACTS: string[] = [
    "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85", // ENS Registry
    // Add more ENS contract addresses
  ];

  transactions.forEach((tx) => {
    const txDate = new Date(Number(tx.timeStamp) * 1000)
      .toISOString()
      .split("T")[0];
    activeDays.add(txDate);

    // Update streaks
    if (lastActiveDay) {
      const lastDate = new Date(lastActiveDay);
      const currentDate = new Date(txDate);
      const dayDiff = Math.floor(
        (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
      longestStreak = 1;
    }
    lastActiveDay = txDate;

    // Count transaction types
    const toAddress = tx.to.toLowerCase();
    const fromAddress = tx.from.toLowerCase();
    if (SWAP_ROUTERS.includes(toAddress)) {
      metrics.tokenSwaps++;
    }
    if (BRIDGE_CONTRACTS.includes(toAddress)) {
      metrics.bridgeTransactions++;
    }
    if (LENDING_CONTRACTS.includes(toAddress)) {
      metrics.lendingTransactions++;
    }
    if (ENS_CONTRACTS.includes(toAddress)) {
      metrics.ensInteractions++;
    }
    if (tx.contractAddress && fromAddress === toAddress) {
      metrics.contractDeployments++;
    }
  });

  metrics.uniqueActiveDays = activeDays.size;
  metrics.longestStreak = longestStreak;
  metrics.currentStreak = currentStreak;

  // Calculate activity period in days
  const firstTx = new Date(Number(transactions[0].timeStamp) * 1000);
  const lastTx = new Date(
    Number(transactions[transactions.length - 1].timeStamp) * 1000
  );
  metrics.activityPeriod = Math.ceil(
    (lastTx.getTime() - firstTx.getTime()) / (1000 * 60 * 60 * 24)
  );

  return metrics;
}

function calculateVolumeScore(metrics: TransactionMetrics): number {
  let score = 0;

  // Total transactions (up to 10 points)
  if (metrics.totalTransactions >= 50) score += 10;
  else if (metrics.totalTransactions >= 25) score += 7;
  else if (metrics.totalTransactions >= 10) score += 5;
  else if (metrics.totalTransactions >= 5) score += 3;

  // Token swaps (up to 8 points)
  if (metrics.tokenSwaps >= 10) score += 8;
  else if (metrics.tokenSwaps >= 5) score += 5;
  else if (metrics.tokenSwaps >= 2) score += 3;

  // Bridge transactions (up to 7 points)
  if (metrics.bridgeTransactions >= 3) score += 7;
  else if (metrics.bridgeTransactions >= 1) score += 4;

  return Math.min(25, score);
}

function calculateConsistencyScore(metrics: TransactionMetrics): number {
  let score = 0;

  // Unique active days (up to 10 points)
  if (metrics.uniqueActiveDays >= 30) score += 10;
  else if (metrics.uniqueActiveDays >= 15) score += 7;
  else if (metrics.uniqueActiveDays >= 7) score += 5;
  else if (metrics.uniqueActiveDays >= 3) score += 3;

  // Longest streak (up to 8 points)
  if (metrics.longestStreak >= 7) score += 8;
  else if (metrics.longestStreak >= 3) score += 5;
  else if (metrics.longestStreak >= 2) score += 3;

  // Current streak (up to 7 points)
  if (metrics.currentStreak >= 5) score += 7;
  else if (metrics.currentStreak >= 2) score += 4;
  else if (metrics.currentStreak >= 1) score += 2;

  return Math.min(25, score);
}

function calculatePeriodScore(metrics: TransactionMetrics): number {
  // Activity period (up to 25 points)
  if (metrics.activityPeriod >= 180) return 25;
  if (metrics.activityPeriod >= 90) return 20;
  if (metrics.activityPeriod >= 60) return 15;
  if (metrics.activityPeriod >= 30) return 10;
  if (metrics.activityPeriod >= 7) return 5;
  return 0;
}

function calculateInteractionScore(metrics: TransactionMetrics): number {
  let score = 0;

  // Lending transactions (up to 10 points)
  if (metrics.lendingTransactions >= 5) score += 10;
  else if (metrics.lendingTransactions >= 2) score += 6;
  else if (metrics.lendingTransactions >= 1) score += 3;

  // ENS interactions (up to 8 points)
  if (metrics.ensInteractions >= 2) score += 8;
  else if (metrics.ensInteractions >= 1) score += 4;

  // Contract deployments (up to 7 points)
  if (metrics.contractDeployments >= 2) score += 7;
  else if (metrics.contractDeployments >= 1) score += 4;

  return Math.min(25, score);
}
