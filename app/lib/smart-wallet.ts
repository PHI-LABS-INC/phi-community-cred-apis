import { Address, createPublicClient, http } from "viem";
import { base, mainnet } from "viem/chains";

// Types for transaction data
export interface TransactionItem {
  hash: string;
  from: string;
  to: string;
  blockNumber: string;
  methodId?: string;
  timeStamp?: string;
  isError?: string;
  input?: string;
}

// GraphQL types for smart contract interactions
interface GraphResponse {
  userOps: Array<{
    sender: string;
    target: string;
    success: boolean;
    blockNumber: string;
    userOpHash: string;
    input: string;
    callData: string;
  }>;
}

interface GraphQLResponse {
  data: GraphResponse;
  errors?: unknown[];
}

// Create public clients for different chains
const baseClient = createPublicClient({ chain: base, transport: http() });
const mainnetClient = createPublicClient({ chain: mainnet, transport: http() });

/**
 * Check if an address is a smart contract
 */
export async function isContractAddress(
  address: Address,
  chainId: number = 8453
): Promise<boolean> {
  try {
    const client = chainId === 8453 ? baseClient : mainnetClient;
    const code = await client.getCode({ address });
    return code !== undefined && code !== "0x";
  } catch (error) {
    console.error("Error checking contract address:", {
      address,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get transactions for EOA wallets using Etherscan/BaseScan API
 */
export async function getEOATransactions(
  address: Address,
  chainId: number = 8453
): Promise<TransactionItem[]> {
  const API_KEYS =
    chainId === 8453
      ? [process.env.BASE_SCAN_API_KEY_01, process.env.BASE_SCAN_API_KEY_02]
      : [
          process.env.ETHERSCAN_API_KEY,
          process.env.ETHERSCAN_API_KEY2,
          process.env.ETHERSCAN_API_KEY3,
        ];

  const BASE_URL =
    chainId === 8453
      ? "https://api.etherscan.io/v2/api"
      : "https://api.etherscan.io/api";

  const RATE_LIMIT_DELAY = 200;
  const PAGE_SIZE = 10000;
  const MAX_RETRIES = 5;

  let allTxs: TransactionItem[] = [];
  let page = 1;
  let hasMore = true;

  const fetchTransactions = async (
    page: number,
    retries = 0
  ): Promise<TransactionItem[]> => {
    const apiKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
    const url = `${BASE_URL}?chainId=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=latest&page=${page}&offset=${PAGE_SIZE}&sort=desc&apikey=${apiKey}`;

    console.log(`[etherscan] Fetching page ${page} for chain ${chainId}...`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch transactions: ${res.statusText}`);
      }
      const data = (await res.json()) as {
        status: string;
        message: string;
        result: TransactionItem[];
      };

      if (data.message === "Max calls per sec rate limit reached (5/sec)") {
        if (retries < MAX_RETRIES) {
          console.warn(
            `Rate limit reached. Retrying in ${RATE_LIMIT_DELAY}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
          return fetchTransactions(page, retries + 1);
        } else {
          throw new Error("Max retry attempts reached due to rate limit.");
        }
      }

      if (data.status !== "1" && (!data.result || data.result.length === 0)) {
        return [];
      }
      return data.result;
    } catch (error) {
      console.error(`Error fetching transactions on page ${page}:`, error);
      throw error;
    }
  };

  while (hasMore) {
    try {
      const txs = await fetchTransactions(page);
      console.log(`Fetched ${txs.length} transactions from page ${page}`);
      allTxs = allTxs.concat(txs);
      if (txs.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } catch (error) {
      console.error("Error during transaction fetch loop:", error);
      break;
    }
  }

  return allTxs;
}

/**
 * Get smart contract transactions using GraphQL (for Account Abstraction)
 */
export async function getSmartContractTransactions(
  address: Address
): Promise<TransactionItem[]> {
  const graphApiKey = process.env.GRAPH_API_KEY;
  if (!graphApiKey) {
    console.warn("Graph API key not found, falling back to EOA transactions");
    return getEOATransactions(address);
  }

  try {
    const allUserOps: TransactionItem[] = [];
    let skip = 0;

    while (true) {
      const response = await retryOperation(() =>
        getDataFromGraph(
          ADDRESS_ACTIVITY_QUERY,
          { address, first: 1000, skip },
          graphApiKey
        )
      );

      if (!response?.userOps?.length) break;

      allUserOps.push(
        ...response.userOps.map((op) => {
          const { methodId, contractAddress } =
            extractMethodIdAndContractAddress(op.callData);
          return {
            hash: op.userOpHash,
            from: op.sender,
            to: contractAddress || "",
            blockNumber: op.blockNumber,
            methodId: methodId,
            isError: op.success ? "0" : "1",
            input: op.input,
          };
        })
      );

      if (response.userOps.length < 1000) break;
      skip += 1000;
    }

    return allUserOps;
  } catch (error) {
    console.error("Failed to fetch smart contract transactions:", error);
    // Fallback to EOA transactions
    return getEOATransactions(address);
  }
}

/**
 * Get transactions for any address type (EOA or smart contract)
 */
export async function getTransactions(
  address: Address,
  chainId: number = 8453
): Promise<TransactionItem[]> {
  const isContract = await isContractAddress(address, chainId);

  if (isContract) {
    console.log(`Address ${address} is a smart contract, using GraphQL API`);
    return getSmartContractTransactions(address);
  } else {
    console.log(`Address ${address} is an EOA, using Etherscan API`);
    return getEOATransactions(address, chainId);
  }
}

/**
 * Extract method ID and contract address from call data
 */
export function extractMethodIdAndContractAddress(preDecodedCallData: string): {
  methodId: string;
  contractAddress: string;
} {
  if (!preDecodedCallData || !preDecodedCallData.startsWith("0x")) {
    return { methodId: "0x", contractAddress: "" };
  }

  try {
    // Contract address is at fixed position (226-266)
    const contractAddress = "0x" + preDecodedCallData.slice(226, 266);
    // Method ID is at position 458 (8 characters)
    if (preDecodedCallData.length >= 466) {
      const methodId = "0x" + preDecodedCallData.slice(458, 466);
      return { methodId, contractAddress };
    }
    return { methodId: "0x", contractAddress };
  } catch (error) {
    console.error("Error extracting data:", error);
    return { methodId: "0x", contractAddress: "" };
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}

/**
 * Get data from GraphQL endpoint
 */
export async function getDataFromGraph(
  query: string,
  variables: Record<string, unknown>,
  graphApiKey: string
): Promise<GraphResponse> {
  const GRAPH_ENDPOINT =
    "https://gateway-arbitrum.network.thegraph.com/api/{API_KEY}/subgraphs/id/9KToKxWC5uRS5ecCFgAxrScDPU2rVMy3hp7abAkt6BED";

  const response = await fetch(
    GRAPH_ENDPOINT.replace("{API_KEY}", graphApiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    }
  );

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const json = (await response.json()) as GraphQLResponse;
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

/**
 * GraphQL query for address activity
 */
export const ADDRESS_ACTIVITY_QUERY = `
  query AddressActivityQuery($address: Bytes, $first: Int, $skip: Int) {
    userOps(first: $first, skip: $skip, orderBy: blockTime, orderDirection: desc, where: { or: [{ sender: $address }, { target: $address }] }) {
      sender
      target
      success
      blockNumber
      userOpHash
      input
      callData
    }
  }
`;

/**
 * Check if address has interacted with specific contract and method
 */
export async function hasContractInteraction(
  address: Address,
  contractAddress: Address,
  methodIds: string[] = [],
  threshold: number = 1,
  chainId: number = 8453
): Promise<boolean> {
  try {
    const transactions = await getTransactions(address, chainId);

    const verifiedTxs = transactions.filter((tx) => {
      if (tx.to.toLowerCase() !== contractAddress.toLowerCase()) {
        return false;
      }
      if (methodIds.length === 0) {
        return true;
      }
      return methodIds.some(
        (id) => tx.methodId?.toLowerCase() === id.toLowerCase()
      );
    });

    return verifiedTxs.length >= threshold;
  } catch (error) {
    console.error("Error checking contract interaction:", error);
    return false;
  }
}
