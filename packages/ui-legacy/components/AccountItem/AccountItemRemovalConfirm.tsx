import {
  clearRemovingAccount,
  removeAccount,
} from "@sendnodes/pokt-wallet-background/redux-slices/accounts";
import {
  AccountTotal,
  selectKeyringByAddress,
} from "@sendnodes/pokt-wallet-background/redux-slices/selectors";
import { HexString } from "@sendnodes/pokt-wallet-background/types";
import React, { ReactElement, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  setSelectedAccount,
  setSnackbarMessage,
} from "@sendnodes/pokt-wallet-background/redux-slices/ui";
import { AddressOnNetwork } from "@sendnodes/pokt-wallet-background/accounts";
import SharedButton from "../Shared/SharedButton";
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary";
import { useBackgroundSelector } from "../../hooks";

interface AccountItemRemovalConfirmProps {
  account: AccountTotal;
  address: HexString;
  close: () => void;
}

const RegularWarning = (
  <span>
    Removing this address doesn&apos;t delete your recovery phrase or any
    private keys. Instead it just hides it from the extension and you won&apos;t
    be able to use it until you add it again.
  </span>
);

const LoudWarning = (
  <span>
    Removing this address will remove the associated account from the extension.
    You will only be able to recover this address by re-importing it. Are you
    sure you want to proceed?
  </span>
);

export default function AccountItemRemovalConfirm({
  account,
  address,
  close,
}: AccountItemRemovalConfirmProps): ReactElement {
  const dispatch = useDispatch();
  const keyring = useBackgroundSelector(selectKeyringByAddress(address));
  const isRemovingAccount = useBackgroundSelector(
    (state) => state.account.removingAccount,
  );
  const onlyOneAddressVisible = keyring?.addresses.length === 1;
  const addressOnNetwork = {
    address: account.address,
    network: account.network,
  } as AddressOnNetwork;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!isMounted) return;

    if (isRemovingAccount === "fulfilled") {
      dispatch(clearRemovingAccount()); // clear the state
      close();
    } else if (isRemovingAccount === "rejected") {
      dispatch(setSnackbarMessage("Something went wrong. Please try again."));
    }
  }, [isRemovingAccount, close, dispatch]); // purposefully not tracking isMounted

  // needs to run last
  useEffect(() => {
    // start fresh
    dispatch(clearRemovingAccount());
    setIsMounted(true);
  }, [dispatch, isRemovingAccount]);

  return (
    <div className="remove_address_option">
      <ul>
        <li className="account_container">
          <SharedAccountItemSummary accountTotal={account} isSelected={false} />
        </li>
      </ul>
      <div className="remove_address_details">
        {onlyOneAddressVisible ? LoudWarning : RegularWarning}
      </div>
      <div className="button_container">
        <SharedButton
          type="primary"
          size="medium"
          isDisabled={!!isRemovingAccount}
          isLoading={!!isRemovingAccount}
          onClick={(e) => {
            e.stopPropagation();
            dispatch(removeAccount(addressOnNetwork));
          }}
        >
          Remove
        </SharedButton>
      </div>
      <style jsx>{`
        .remove_address_option {
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .remove_address_option > * {
          margin-bottom: 1.5rem;
        }

        .remove_address_details {
          display: flex;
          flex-direction: column;
          line-height: 1.5rem;
        }
        .button_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }

        .button_container :global(button) {
          width: 100%;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
