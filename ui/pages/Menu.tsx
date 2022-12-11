import React, { ReactElement } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  setNewDefaultWalletValue,
  selectDefaultWallet,
  selectHideDust,
  toggleHideDust,
} from "@sendnodes/pokt-wallet-background/redux-slices/ui"
import browser from "webextension-polyfill"
import SharedButton from "../components/Shared/SharedButton"
import SharedToggleButton from "../components/Shared/SharedToggleButton"
import t from "../utils/i18n"

function SettingRow(props: {
  title: string
  component: () => ReactElement
}): ReactElement {
  const { title, component } = props

  return (
    <li>
      <div className="left">{title}</div>
      <div className="right">{component()}</div>
      <style jsx>
        {`
          li {
            height: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .left {
            color: var(--spanish-gray);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
        `}
      </style>
    </li>
  )
}

export default function Menu(): ReactElement {
  const dispatch = useDispatch()
  const hideDust = useSelector(selectHideDust)
  const defaultWallet = useSelector(selectDefaultWallet)

  const toggleHideDustAssets = (toggleValue: boolean) => {
    dispatch(toggleHideDust(toggleValue))
  }
  const toggleDefaultWallet = (defaultWalletValue: boolean) => {
    dispatch(setNewDefaultWalletValue(defaultWalletValue))
  }
  const settings = {
    general: [
      {
        title: t("menuHideSmallAssetBalance", "2"),
        component: () => (
          <SharedToggleButton
            onChange={(toggleValue) => toggleHideDustAssets(toggleValue)}
            value={hideDust}
          />
        ),
      },

      // TODO SendWallet is incapable of being a default wallet
      // {
      //   title: t("menuSetAsDefault"),
      //   component: () => (
      //     <SharedToggleButton
      //       onChange={(toggleValue) => toggleDefaultWallet(toggleValue)}
      //       value={defaultWallet}
      //     />
      //   ),
      // },
    ],
  }

  return (
    <>
      <section className="standard_width_padded">
        <h1>Main menu</h1>
        <ul>
          {settings.general.map((setting) => (
            <SettingRow
              key={setting.title}
              title={setting.title}
              component={setting.component}
            />
          ))}
        </ul>
        <div className="community_cta_wrap">
          <h2>Join our community</h2>
          <p>Join our discord to give us feedback!</p>
          <SharedButton
            type="primary"
            size="large"
            icon="discord"
            iconSize="large"
            iconPosition="left"
            onClick={() => {
              window.open(`https://discord.gg/TmfYqaXzGb`, "_blank")?.focus()
            }}
          >
            Join and give feedback
          </SharedButton>
        </div>
        <div className="version">
          Version: {browser.runtime.getManifest()?.version ?? `<unknown>`}
        </div>
      </section>
      <style jsx>
        {`
          section {
            display: flex;
            flex-flow: column;
            height: 544px;
            background-color: var(--eerie-black-100);
          }
          .community_cta_wrap {
            width: 100vw;
            margin-top: auto;
            margin-left: -21px;
            background-color: var(--cod-gray-200);
            text-align: center;
            padding: 24px 0px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          h1 {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            margin-bottom: 5px;
          }
          h2 {
            font-weight: 500;
            font-size: 22px;
            padding: 0px;
            margin: 0px 0px -1px 0px;
          }
          p {
            color: var(--spanish-gray);
            text-align: center;
            font-size: 16px;
            margin-top: 6px;
            margin-bottom: 24px;
          }
          span {
            color: var(--spanish-gray);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
          }
          .mega_discord_chat_bubble_button {
            background: url("./images/tally_ho_chat_bubble@2x.png");
            background-size: cover;
            width: 266px;
            height: 120px;
            margin-top: 20px;
          }
          .mega_discord_chat_bubble_button:hover {
            opacity: 0.8;
          }
          .version {
            margin: 16px 0;
            color: var(--spanish-gray);
            font-size: 16px;
            font-weight: 500;
            margin: 0 auto;
            padding: 16px 0px;
          }
        `}
      </style>
    </>
  )
}
