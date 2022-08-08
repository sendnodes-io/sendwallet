import React from "react"
import { Fragment, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Icon } from "@iconify/react"
import { XIcon } from "@heroicons/react/outline"

export default function StakePausedModal({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => {
          setOpen(false)
        }}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-eerie-black bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end sm:items-center justify-center min-h-full p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative bg-eerie-black rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-sm sm:w-full sm:p-6 border border-dashed">
                <>
                  <div>
                    <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
                      <button
                        type="button"
                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-aqua focus:ring-offset-aqua"
                        onClick={(e) => {
                          e.preventDefault()
                          setOpen(false)
                        }}
                      >
                        <span className="sr-only">Close</span>
                        <XIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-700">
                      <span className="text-3xl">👷‍♀️</span>
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <Dialog.Title
                        as="h3"
                        className="text-lg leading-6 font-medium text-white"
                      >
                        Staking Paused
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm">
                          SendNodes is currently not taking any new staking
                          requests. Please try again later! Check our socials
                          for updates.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 flex gap-x-4 items-center justify-center">
                    <a
                      className="bg-spanish-gray text-white rounded-full w-10 h-10 flex items-center justify-center"
                      target="_blank"
                      href="https://discord.gg/Gh76tPkjTn"
                    >
                      <Icon icon="simple-icons:discord" className="w-6 h-6" />
                    </a>
                    <a
                      className="bg-spanish-gray text-white rounded-full w-10 h-10 flex items-center justify-center"
                      target="_blank"
                      href="https://twitter.com/_SendNodes_"
                    >
                      <Icon
                        icon="akar-icons:twitter-fill"
                        className="w-6 h-6"
                      />
                    </a>
                    <a
                      className="bg-spanish-gray text-white rounded-full w-10 h-10 flex items-center justify-center"
                      target="_blank"
                      href="https://t.me/poktwallet"
                    >
                      <Icon icon="uit:telegram-alt" className="w-6 h-6" />
                    </a>
                  </div>
                </>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
