<img src="./docs/img/sendwallet-doc.jpg"/>

# SendWallet - https://sendwallet.net

Welcome to the official repo of SendWallet.

Get the ease of accessing your $POKT with our secure SendWallet browser extension.

The SendWallet is your gateway to the Pocket Network and broader ecosystem. Full EVM support soon.

## Looking to integrate SendWallet into your site?

SendWallet can turn your site into a Dapp on Pocket Network. You will be able to prepare and request transactions for your users to approve. Start here with [our integration guide](/docs/integration.md)!

## 🙋‍♀️ First time here?

Start with our amazing docs, https://docs.sendwallet.net/.

More questions, please find us on:

- [Twitter](https://twitter.com/SendWallet)
- [Discord](https://discord.gg/Gh76tPkjTn)
- [Telegram](https://t.me/send_wallet)

## 👩🏻‍💻 Contributing

SendNodes, Inc. is looking for amazing contributors to make SendWallet the best browser extension wallet. Feel free to fork the repo and start shipping code! For the latest news on our roadmap and milestones, please join our Discord server.

## 👷‍♀️ Building

You'll need a few tools to get started.

- NodeJS v16
- Yarn

```sh
yarn start --config-name chrome # or firefox
```

Once that finishes, please find the built files in the `./dist` directory. Then, visit <a href="chrome://extensions">chrome://extensions</a> load the `./dist/chrome` directory as an unpacked extension.

Prepare safari build

```sh
xcrun safari-web-extension-converter --project-location ./ios \
  --app-name SendWallet  \
  --bundle-identifier com.sendnodes.sendwallet \
  --force \
  ./dist/safari
```
