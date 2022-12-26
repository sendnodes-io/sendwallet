import React, {
  FormEvent,
  ReactElement,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  InMemoryKVStore as PocketInMemoryKVStore,
  Keybase as PocketKeybase,
} from "@pokt-network/pocket-js/dist/index";

import {
  clearImporting,
  ImportPrivateKey,
  importPrivateKey as importPrivateKeyBackground,
} from "@sendnodes/pokt-wallet-background/redux-slices/keyrings";
import { useHistory } from "react-router-dom";
import classNames from "clsx";
import { IoIosCheckmark } from "react-icons/io";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import { KeyType } from "@sendnodes/pokt-wallet-background/services/keyring";
import SharedButton from "../../components/Shared/SharedButton";
import OnboardingAccountLayout from "../../components/Onboarding/OnboardingAccountLayout";
import {
  useBackgroundSelector,
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
} from "../../hooks";
import { OnboardingImportRecoveryPhraseIcon } from "../../components/Onboarding/Icons";
import SharedInput from "../../components/Shared/SharedInput";
import { KeyringTypes } from "@sendnodes/pokt-wallet-background/types";

export default function OnboardingImportKeyfile() {
  const rootRef = useRef<HTMLDivElement>(null);
  const keyfileInputRef = useRef<HTMLInputElement>(null);
  const [usingPrivateKey, setUsingPrivateKey] = useState(false);
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [importPrivateKeyType, setImportPrivateKeyType] =
    useState<KeyringTypes | null>(null);
  const [importPrivateKeyLabel, setImportPrivateKeyLabel] = useState("");
  const [importKeyfileContents, setImportKeyfileContents] = useState<
    string | null
  >(null);
  const [importKeyfile, setImportKeyfile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const areKeyringsUnlocked = useAreKeyringsUnlocked(true);

  const [importPassphrase, setImportPassphrase] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const dispatch = useBackgroundDispatch();
  const keyringImport = useBackgroundSelector(
    (state) => state.keyrings.importing,
  );

  const history = useHistory();

  useEffect(() => {
    // always start fresh
    dispatch(clearImporting());
  }, [dispatch]);

  // handle success state or failure after importing started
  useEffect(() => {
    if (isImporting && keyringImport === "done") {
      // it worked
      dispatch(clearImporting()); // clean up
      history.push("/onboarding/account-created");
    }

    if (keyringImport === "failed") {
      setErrorMessage("Something went wrong. Please try again.");
      setIsImporting(false);
    }
  }, [history, areKeyringsUnlocked, keyringImport, isImporting]);

  // determine keyring type to show user
  useEffect(() => {
    if (importPrivateKeyType) {
      if (importPrivateKeyType === KeyringTypes.singleSECP) {
        setImportPrivateKeyLabel("EVM compatible private key detected");
      }
      if (importPrivateKeyType === KeyringTypes.singleED25519) {
        setImportPrivateKeyLabel("POKT compatible private key detected");
      }
    } else {
      setImportPrivateKeyLabel("ENTER PRIVATE KEY");
    }
  }, [importPrivateKey, importPrivateKeyType]);

  const readKeyfile = async (file: File) => {
    const fileReader = new FileReader();

    const promise = new Promise<string | null>((resolve) => {
      fileReader.onloadend = (_) => {
        if (fileReader.error) {
          return resolve(null);
        }
        const contents = fileReader.result?.toString();
        if (contents === undefined) return resolve(null);
        return resolve(contents);
      };
    });

    fileReader.readAsText(file, "UTF-8");

    return promise;
  };

  const computePrivateKey = async (keyfile: string, passphrase: string) => {
    const pocketKeybase = new PocketKeybase(new PocketInMemoryKVStore());
    const account = await pocketKeybase.importPPKFromJSON(
      passphrase,
      keyfile,
      passphrase,
    );
    if (account instanceof Error) {
      throw account;
    }
    const unlockedAccount = await pocketKeybase.getUnlockedAccount(
      account.addressHex,
      passphrase,
    );
    if (unlockedAccount instanceof Error) {
      throw account;
    }

    return unlockedAccount.privateKey.toString("hex");
  };

  const importWallet = useCallback(async () => {
    if (isImporting) {
      return;
    }
    // clear error
    setErrorMessage("");

    if (usingPrivateKey) {
      await importWalletFromPrivateKey();
    } else {
      await importWalletFromKeyfile();
    }
  }, [
    dispatch,
    importPassphrase,
    importKeyfileContents,
    importPrivateKey,
    usingPrivateKey,
  ]);

  const importWalletFromKeyfile = useCallback(async () => {
    if (isImporting) {
      return;
    }
    // clear error
    setErrorMessage("");

    if (importKeyfileContents === null) {
      setErrorMessage("Please attach a keyfile");
      return;
    }

    if (importPassphrase === "") {
      setErrorMessage("Invalid passphrase");
      return;
    }

    setIsImporting(true);

    try {
      const privateKey = await computePrivateKey(
        importKeyfileContents,
        importPassphrase,
      );

      await dispatch(
        importPrivateKeyBackground({
          privateKey,
          keyType: KeyType.ED25519,
        }),
      );
    } catch (e) {
      setErrorMessage(`Invalid import, reason: ${e}`);
      setIsImporting(false);
    }
  }, [dispatch, importPassphrase, importKeyfileContents]);

  const importWalletFromPrivateKey = useCallback(async () => {
    if (isImporting) {
      return;
    }
    // clear error
    setErrorMessage("");

    if (importPrivateKey === "") {
      setErrorMessage("Invalid private key");
      return;
    }

    setIsImporting(true);

    try {
      let fixedKeyring: ImportPrivateKey;
      // ed25519 private are 64 bytes
      if (ethers.utils.isHexString(`0x${importPrivateKey}`, 64)) {
        const pocketKeybase = new PocketKeybase(new PocketInMemoryKVStore());
        const account = await pocketKeybase.importAccount(
          Buffer.from(importPrivateKey, "hex"),
          "poktwallet",
        );
        if (account instanceof Error) {
          throw account;
        }
        const unlockedAccount = await pocketKeybase.getUnlockedAccount(
          account.addressHex,
          "poktwallet",
        );
        if (unlockedAccount instanceof Error) {
          throw unlockedAccount;
        }

        fixedKeyring = {
          privateKey: unlockedAccount.privateKey.toString("hex"),
          keyType: KeyType.ED25519,
        };
      } else if (ethers.utils.isHexString(`0x${importPrivateKey}`, 32)) {
        // secp25k1 private are 32 bytes
        fixedKeyring = {
          privateKey: importPrivateKey,
          keyType: KeyType.SECP256K1,
        };
      } else {
        setErrorMessage("Invalid private key");
        return;
      }

      await dispatch(importPrivateKeyBackground(fixedKeyring));
    } catch (e) {
      setErrorMessage(`Invalid import. ${e}`);
    }
  }, [dispatch, importPrivateKey]);

  const handleDroppedFile = async (ev: DragEvent) => {
    setIsDragging(false);
    ev.stopPropagation();
    ev.preventDefault();
    if (ev.dataTransfer) {
      // validate JSON here
      const file = ev.dataTransfer.files[0];
      setImportKeyfile(file);
    }
  };

  // listen for drag events on window for easy DnD
  useEffect(() => {
    const handleDragging = (ev: DragEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = (ev: DragEvent) => {
      if (ev.target === document.documentElement) setIsDragging(false);
      if (ev.screenX === 0 && ev.screenY === 0) setIsDragging(false);
    };
    document.addEventListener("dragenter", handleDragging);
    document.addEventListener("dragover", handleDragging);
    document.addEventListener("dragend", handleDragLeave);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDroppedFile);

    return () => {
      document.removeEventListener("dragenter", handleDragging);
      document.removeEventListener("dragover", handleDragging);
      document.removeEventListener("dragend", handleDragLeave);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDroppedFile);
    };
  }, []);

  // validate
  useEffect(() => {
    const validate = async () => {
      setErrorMessage("");
      setImportKeyfileContents(null);

      if (importKeyfile === null) {
        return;
      }
      const results =
        importKeyfile === null ? null : await readKeyfile(importKeyfile);
      try {
        if (results) {
          JSON.parse(results);
          setImportKeyfileContents(results);
          return;
        }
      } catch (e) {
        console.warn("Invalid JSON", e);
      }
      setErrorMessage("Invalid keyfile");
    };
    validate().catch(console.error);
  }, [importKeyfile, setImportPassphrase]);

  if (!areKeyringsUnlocked) return <></>;

  return (
    <div ref={rootRef}>
      <OnboardingAccountLayout
        showCloseButton
        icon={<OnboardingImportRecoveryPhraseIcon />}
        title={
          <>
            <div className="stacked">
              <h1>Import Account</h1>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                <h3 style={{ flex: 1, width: "8rem", textAlign: "right" }}>
                  <small>Using Keyfile</small>
                </h3>
                <label className="switch">
                  <input
                    disabled={isImporting}
                    checked={!usingPrivateKey}
                    onChange={() => setUsingPrivateKey(!usingPrivateKey)}
                    type="checkbox"
                  />
                  <span className="slider round" />
                </label>
                <h3 style={{ flex: 1, width: "8rem", textAlign: "left" }}>
                  <small>Using Private Key</small>
                </h3>
              </div>
              <h2>
                {usingPrivateKey
                  ? "Input the private key of the POKT account. The private key will be encrypted using the wallet password."
                  : "Attach or drag-and-drop the keyfile below and enter the keyfile passphrase."}
              </h2>
            </div>
          </>
        }
        body={
          <div className="import_wrap">
            {usingPrivateKey ? (
              <div className="import_private_key_wrap">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await importWalletFromPrivateKey();
                  }}
                  style={{ width: "100%" }}
                >
                  <SharedInput
                    label={importPrivateKeyLabel}
                    type="password"
                    disabled={isImporting}
                    parseAndValidate={(val) => {
                      val = val.replace(/^0x/, "").trim();
                      if (!val) {
                        return { parsed: undefined };
                      }
                      if (ethers.utils.isHexString(`0x${val}`, 32)) {
                        setImportPrivateKeyType(KeyringTypes.singleSECP);
                      } else if (ethers.utils.isHexString(`0x${val}`, 64)) {
                        setImportPrivateKeyType(KeyringTypes.singleED25519);
                      } else {
                        setImportPrivateKeyType(null);
                        return { parsed: val, error: "Invalid private key" };
                      }
                      return { parsed: val };
                    }}
                    onChange={setImportPrivateKey}
                    focusedLabelBackgroundColor="var(--eerie-black-200)"
                  />
                </form>
              </div>
            ) : (
              <div className="import_keyfile_wrap">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await importWallet();
                  }}
                  style={{ width: "100%" }}
                >
                  <label
                    htmlFor="keyfile"
                    className={classNames({
                      active: importKeyfile && importKeyfileContents,
                      dragging: isDragging,
                    })}
                  >
                    <span className="center_text">
                      <small>
                        {importKeyfile && importKeyfileContents
                          ? `${importKeyfile.name} attached`
                          : "Upload Keyfile"}
                      </small>
                    </span>
                    <div className="keyfile_input_icon_wrap">
                      <div className="dashed_border">
                        <div className="keyfile_input_icon" />
                      </div>
                      <div className="checkmark">
                        <IoIosCheckmark style={{ position: "absolute" }} />
                      </div>
                    </div>
                    <input
                      ref={keyfileInputRef}
                      type="file"
                      id="keyfile"
                      accept="application/JSON"
                      onChange={(e) =>
                        e.target.files && setImportKeyfile(e.target.files[0])
                      }
                    />
                  </label>

                  <SharedInput
                    label="ENTER KEYFILE PASSPHRASE"
                    type="password"
                    onChange={setImportPassphrase}
                    focusedLabelBackgroundColor="var(--eerie-black-200)"
                  />
                </form>
              </div>
            )}
          </div>
        }
        buttons={
          <>
            <div>
              <span
                className="text-xs"
                style={{
                  color: "var(--error)",
                  margin: "0.5rem 0 1rem",
                  display: "block",
                  textAlign: "center",
                }}
              >
                {errorMessage || <br />}
              </span>
            </div>
            <div style={{ marginBottom: "1rem", width: "100%" }}>
              <SharedButton
                type="primary"
                size="large"
                iconSize="large"
                isDisabled={isImporting}
                isLoading={isImporting}
                onClick={importWallet}
              >
                IMPORT ACCOUNT
              </SharedButton>
            </div>
          </>
        }
      />
      <style jsx>
        {`
          div :global(.top) {
            margin-top: 4rem;
            height: 7rem;
          }
          div :global(.stacked) {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          div :global(.stacked h2) {
            color: var(--spanish-gray);
            max-width: 22rem;
            height: 5rem;
            margin: 1rem 0;
            line-height: 1.5rem;
          }
          div :global(.buttons p) {
            color: var(--spanish-gray);
          }
          div :global(.import_keyfile_wrap, .import_private_key_wrap) {
            padding: 1.5rem 0 0rem;
            width: 20rem;
            display: flex;
            flex-grow: 1;
            margin: auto;
            height: 16rem;
          }
          div
            :global(.import_keyfile_wrap form, .import_private_key_wrap form) {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            height: 100%;
            justify-content: center;
            width: 100%;
          }

          div :global(label[for="keyfile"]) {
            width: 100%;
            margin-bottom: 2rem;
            cursor: pointer;
            position: relative;
          }
          div :global(label[for="keyfile"] span) {
            margin-bottom: 0.75rem;
          }

          div :global(.keyfile_input_icon_wrap) {
            display: flex;
            height: 8rem;
            width: 8rem;
            background-color: var(--black);
            margin: auto;
            border-radius: 0.5rem;
            position: relative;
          }

          div :global(.keyfile_input_icon_wrap .dashed_border) {
            flex-grow: 1;
            display: flex;
            padding: 1.5rem;
          }
          div :global(.keyfile_input_icon) {
            flex-grow: 1;
            mask-image: url("./images/file@2x.png");
            mask-size: contain;
            mask-repeat: no-repeat;
            background-color: var(--aqua);
            transition: background-color 0.8s;
          }

          div :global(label[for="keyfile"].dragging .keyfile_input_icon_wrap),
          div :global(label[for="keyfile"].active .keyfile_input_icon_wrap) {
            background-color: var(--onyx-200);
          }
          div :global(label[for="keyfile"].dragging .keyfile_input_icon) {
            background-color: var(--white);
          }

          div :global(label[for="keyfile"].active span) {
            color: var(--white);
          }

          div :global(label[for="keyfile"]:active .keyfile_input_icon),
          div :global(label[for="keyfile"].active .keyfile_input_icon),
          div :global(label[for="keyfile"]:active .keyfile_input_icon),
          div :global(label[for="keyfile"]:hover .keyfile_input_icon) {
            background-color: var(--white);
          }

          div :global(.import_wrap) {
            width: 100%;
          }
          div :global(label[for="keyfile"] .checkmark) {
            opacity: 0;
            visibility: hidden;
            position: absolute;
            top: 0;
            right: 0;
            height: 1rem;
            width: 1rem;
            border-radius: 0.5rem;
            background-color: var(--white);
            color: var(--white);
            transition: opacity 0.4s, background-color 0.4s;
          }

          div :global(label[for="keyfile"].active .checkmark) {
            visibility: visible;
            background-color: var(--capri);
            opacity: 1;
          }

          div :global(.import_keyfile_wrap input[type="file"]) {
            opacity: 0;
            position: absolute;
            z-index: -1;
          }

          div :global(.shared_input) {
            margin-bottom: 0;
          }

          /* The switch - the box around the slider */
          div :global(.switch) {
            position: relative;
            display: inline-block;
            width: 3.75rem;
            height: 2.05rem;
          }

          /* Hide default HTML checkbox */
          div :global(.switch input) {
            opacity: 0;
            width: 0;
            height: 0;
          }

          /* The slider */
          div :global(.slider) {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--spanish-gray);
            transition: 0.4s;
          }

          div :global(.slider:before) {
            position: absolute;
            content: "";
            height: 1.625rem;
            width: 1.625rem;
            right: 0.25rem;
            bottom: 0.25rem;
            background-color: var(--white);
            transition: 0.4s;
          }

          div :global(input:checked + .slider) {
            background-color: var(--capri);
          }

          div :global(input:focus + .slider) {
            box-shadow: 0 0 1px var(--capri);
          }

          div :global(input:checked + .slider:before) {
            transform: translateX(-1.625rem);
          }

          /* Rounded sliders */
          div :global(.slider.round) {
            border-radius: 2.1rem;
          }

          div :global(.slider.round:before) {
            border-radius: 50%;
          }
        `}
      </style>
    </div>
  );
}
