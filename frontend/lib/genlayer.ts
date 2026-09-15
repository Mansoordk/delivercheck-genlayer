import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  ExecutionResult,
  TransactionHash,
  TransactionStatus,
} from "genlayer-js/types";

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "";

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask or another EIP-1193 wallet is required.");
  }

  return window.ethereum;
}

export async function connectWallet() {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not configured."
    );
  }

  const provider = getProvider();

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts?.[0]) {
    throw new Error("No wallet account was returned.");
  }

  const address = accounts[0] as `0x${string}`;

  const client = createClient({
    chain: studionet,
    account: address,
    provider,
  });

  await client.connect("studionet");

  return {
    address,
    client,
  };
}

export function getReadClient() {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not configured."
    );
  }

  return createClient({
    chain: studionet,
  });
}

export function getWalletClient(account: `0x${string}`) {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not configured."
    );
  }

  return createClient({
    chain: studionet,
    account,
    provider: getProvider(),
  });
}

export async function waitForDecision(
  client: ReturnType<typeof getReadClient>,
  hash: `0x${string}`,
  onStatus?: (status: string) => void,
) {
  onStatus?.("WAITING_FOR_DECISION");

  const transaction = await client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 240,
  });

  onStatus?.("ACCEPTED");

  return transaction;
}

export async function waitForReceipt(
  client: ReturnType<typeof getReadClient>,
  hash: `0x${string}`,
) {
  return client.waitForTransactionReceipt({
    hash: hash as TransactionHash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 240,
  });
}

export function assertSuccessfulReturn(receipt: {
  txExecutionResultName?: ExecutionResult;
}) {
  if (
    receipt.txExecutionResultName &&
    receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN
  ) {
    throw new Error(
      `Transaction execution failed: ${receipt.txExecutionResultName}`,
    );
  }
}