import { Icon } from "@iconify/react"
import React from "react"

export default function Footer() {
  return (
    <footer className="bg-rich-black w-full mt-48">
      <div className="max-w-7xl mx-auto pt-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <a
            target="_blank"
            href={`https://twitter.com/_SendNodes_`}
            className="text-white hover:text-aqua"
          >
            <span className="sr-only">Twitter</span>
            <Icon icon="akar-icons:twitter-fill" className="w-6 h-6" />
          </a>
          <a
            target="_blank"
            href={`https://github.com/sendnodes-io`}
            className="text-white hover:text-aqua"
          >
            <span className="sr-only">Github</span>
            <Icon icon="akar-icons:github-fill" className="w-6 h-6" />
          </a>
          <a
            target="_blank"
            href={`https://discord.gg/TmfYqaXzGb`}
            className="text-white hover:text-aqua"
          >
            <span className="sr-only">Discord</span>
            <Icon icon="simple-icons:discord" className="w-6 h-6" />
          </a>
          <a
            target="_blank"
            href={`https://t.me/send_wallet`}
            className="text-white hover:text-aqua"
          >
            <span className="sr-only">Telegram</span>
            <Icon icon="uit:telegram-alt" className="w-6 h-6" />
          </a>
        </div>
        <div className="mt-8 md:mt-0 md:order-1">
          <p className="text-center text-base text-white">
            <img
              src="/images/sendnodes.png"
              width={"558"}
              height="84"
              className="block w-56 mb-4 mx-auto md:mx-0"
              alt="SendNodes"
              title="SendNodes"
            />
            &copy; {new Date().getFullYear()} SendNodes, Inc. All rights
            reserved.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8 text-sm text-center w-full">
        <p>
          Are you a node runner? Wanna get your staking services integrated with
          the wallet? Contact us at{" "}
          <a className="underline" href="mailto:info@sendnodes.io">
            info@sendnodes.io
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
