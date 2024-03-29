import React, { ReactElement, useState } from "react";

import SharedModal from "../Shared/SharedModal";
import { XIcon } from "@heroicons/react/outline";
import SharedButton from "../Shared/SharedButton";
import { Icon } from "@iconify/react";

export const NeedHelpModal = (): ReactElement => {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="fixed z-10 bottom-6 right-6">
      <a
        href="#_"
        onClick={(e) => {
          e.preventDefault();
          setShowModal(true);
        }}
        className="flex bg-onyx-100 rounded-full p-2 px-4 hover:bg-onyx-200 hover:text-white hover:fill-white align-middle gap-1"
      >
        Need Help?
        <Icon
          width="1.5rem"
          height="1.5rem"
          icon="material-symbols:help-outline"
          className="fill-current"
        />
      </a>
      <SharedModal isOpen={showModal} onClose={() => setShowModal(false)}>
        <>
          <div className="absolute top-0 right-0 pt-5 pr-5 z-20">
            <button
              type="button"
              className="rounded-md text-spanish-gray hover:text-white  "
              onClick={() => setShowModal(false)}
            >
              <span className="sr-only">Close</span>
              <XIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="z-0">
            <div className="text-center relative py-4 mb-2">
              <h3 className="text-2xl">Need Help?</h3>
              <p className="mb-4">
                For help or support please find us in our official Telegram
                group.
              </p>
              <SharedButton
                type="primary"
                size="large"
                onClick={() => {
                  window.open("https://t.me/send_wallet", "_blank");
                }}
              >
                Telegram
                <Icon icon="uit:telegram-alt" className="w-6 h-6" />
              </SharedButton>
            </div>
          </div>
        </>
      </SharedModal>
    </div>
  );
};
