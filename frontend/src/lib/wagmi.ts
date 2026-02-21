import { createConfig, http, fallback } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected(),
  ],
  transports: {
    [polygonAmoy.id]: fallback([
      http(import.meta.env.VITE_RPC_URL),
      http('https://polygon-amoy.drpc.org'),
      http('https://rpc.ankr.com/polygon_amoy'),
      http('https://rpc-amoy.polygon.technology'),
      http('https://polygon-amoy-bor-rpc.publicnode.com'),
    ].filter(Boolean)),
  },
  batch: {
    multicall: true,
  },
});
