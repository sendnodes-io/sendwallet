export default function usePocketNetworkFee() {
  // TODO: write a network data hook
  const networkFee = 1e4;

  return { networkFee, isLoading: false, error: undefined };
}
