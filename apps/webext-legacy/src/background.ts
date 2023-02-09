self.PROCESS_ID = `background-${Math.random()}.${new Date().getTime()}`;
(async () => {
  // this supports both manifest v2 and v3 due to a quirk in webpack-target-webextension
  const { startApi } = await import("@sendnodes/pokt-wallet-background");
  await startApi();
})();
