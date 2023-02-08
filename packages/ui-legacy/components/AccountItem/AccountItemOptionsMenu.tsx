import { AccountTotal } from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { HexString } from "@sendnodes/pokt-wallet-background/types";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";
import { useOnClickOutside } from "../../hooks";
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu";
import AccountItemRemovalConfirm from "./AccountItemRemovalConfirm";
import AccountItemEditName from "./AccountItemEditName";
import RemoveAddressLabel from "./AccountItemRemoveAddressLabel";
import EditWalletNameLabel from "./AccountItemEditWalletNameLabel";
import ExportPrivateKeyLabel from "./AccountItemExportPrivateKeyLabel";
import AccountItemExportPrivateKeyConfirm from "./AccountItemExportPrivateKeyConfirm";
import { AccountType } from "@sendnodes/pokt-wallet-background/redux-slices/AccountType";

type AccountItemOptionsMenuProps = {
  accountTotal: AccountTotal;
  address: HexString;
};

export default function AccountItemOptionsMenu({
  accountTotal,
  address,
}: AccountItemOptionsMenuProps): ReactElement {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAddressRemoveConfirm, setShowAddressRemoveConfirm] =
    useState(false);
  const [showExportPrivateKeyConfirm, setShowExportPrivateKeyConfirm] =
    useState(false);
  const [showEditWalletName, setShowEditWalletName] = useState(false);
  const optionsMenuRef = useRef<null | HTMLUListElement>(null);
  useOnClickOutside(optionsMenuRef, () => {
    setShowOptionsMenu(false);
  });

  useEffect(() => {
    if (showOptionsMenu && optionsMenuRef?.current) {
      optionsMenuRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [showOptionsMenu]);

  return (
    <div>
      <div className="options_menu_wrap">
        <button
          type="button"
          className="icon_settings"
          role="menu"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "enter") {
              setShowOptionsMenu(true);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowOptionsMenu(true);
          }}
        >
          <FiMoreHorizontal />
        </button>

        {showOptionsMenu && (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <ul
            ref={optionsMenuRef}
            className="options"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseOver={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          >
            <li className="option">
              <button
                className="edit_wallet_name_button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsMenu(false);
                  setShowEditWalletName(true);
                }}
              >
                <EditWalletNameLabel hoverable />
              </button>
              <button
                type="button"
                className="close_button"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsMenu(false);
                }}
              >
                <div className="icon_close" />
              </button>
            </li>
            <li className="option">
              <button
                className="remove_address_button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsMenu(false);
                  setShowAddressRemoveConfirm(true);
                }}
              >
                <RemoveAddressLabel hoverable />
              </button>
            </li>
            {accountTotal.accountType !== AccountType.ReadOnly && (
              <li className="option">
                <button
                  className="export_pk_button"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptionsMenu(false);
                    setShowExportPrivateKeyConfirm(true);
                  }}
                >
                  <ExportPrivateKeyLabel hoverable />
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      <div title="Remove Address">
        <SharedSlideUpMenu
          title="Remove Address"
          size="auto"
          isOpen={showAddressRemoveConfirm}
          close={(e) => {
            e?.stopPropagation();
            setShowAddressRemoveConfirm(false);
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ cursor: "default", height: "100%" }}
          >
            <AccountItemRemovalConfirm
              address={address}
              account={accountTotal}
              close={() => setShowAddressRemoveConfirm(false)}
            />
          </div>
        </SharedSlideUpMenu>
      </div>
      <div title="Edit Wallet Name">
        <SharedSlideUpMenu
          title="Edit Name"
          size="small"
          isOpen={showEditWalletName}
          close={(e) => {
            e?.stopPropagation();
            setShowEditWalletName(false);
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ cursor: "default", height: "100%" }}
          >
            <AccountItemEditName
              address={address}
              account={accountTotal}
              close={() => setShowEditWalletName(false)}
            />
          </div>
        </SharedSlideUpMenu>
      </div>
      <div title="Export Private Key">
        <SharedSlideUpMenu
          title="Export Private Key"
          size="auto"
          isOpen={showExportPrivateKeyConfirm}
          close={(e) => {
            e?.stopPropagation();
            setShowExportPrivateKeyConfirm(false);
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{ cursor: "default", height: "100%" }}
          >
            <AccountItemExportPrivateKeyConfirm
              address={address}
              account={accountTotal}
              close={() => setShowExportPrivateKeyConfirm(false)}
            />
          </div>
        </SharedSlideUpMenu>
      </div>
      <style jsx>
        {`
          .options_menu_wrap {
            position: relative;
            z-index: 1;
          }
          .icon_settings {
            color: var(--aqua);
            margin-left: 1rem;
          }
          .icon_settings :global(svg) {
            width: 2rem;
            height: 1.5rem;
          }
          .icon_settings:hover {
            color: var(--white);
          }
          .options {
            position: absolute;
            right: 0.5rem;
            top: -0.5rem;
            cursor: default;
            background-color: var(--nero);
            display: flex;
            align-items: center;
            flex-direction: column;
            justify-content: space-between;
            width: 13.25rem;
            border-radius: 0.25rem;
          }
          .option {
            box-sizing: border-box;
            display: flex;
            line-height: 1.5rem;
            padding: 1rem;
            flex-direction: row;
            width: 100%;
            align-items: center;
            height: 100%;
            cursor: default;
            justify-content: space-between;
          }
          .icon_close {
            display: absolute;
            position: relative;
            top: 0;
            right: 0;
          }
          div :global(.slide_up_menu_wrap) {
            cursor: default;
          }
        `}
      </style>
    </div>
  );
}
