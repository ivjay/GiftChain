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
      http('https://rpc-amoy.polygon.technology'),
      http('https://polygon-amoy.drpc.org'),
      http('https://rpc.ankr.com/polygon_amoy'),
      http('https://polygon-amoy-bor-rpc.publicnode.com'),
      http('https://1rpc.io/amoy'),
    ]),
  },
  batch: {
    multicall: true,
  },
});
