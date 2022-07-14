import { createSlice } from "@reduxjs/toolkit"

import { AnyEVMBlock, POKTBlock, POKTSkinnyBlock } from "../networks"

type EVMNetworkState = {
  blocks: { [blockHeight: number]: AnyEVMBlock }
  blockHeight: number | null
}
type POKTNetworkState = {
  blocks: { [blockHeight: number]: POKTBlock }
  blockHeight: number | null
}

export type NetworksState = {
  evm: {
    [chainID: string]: EVMNetworkState
  },
  pokt: {
    [chainID: string]: POKTNetworkState
  }
}

export const initialState: NetworksState = {
  evm: {
    "1": {
      blockHeight: null,
      blocks: {},
    },
  },
  pokt: {
    "mainnet": {
      blockHeight: null,
      blocks: {}
    }
  }
}

const networksSlice = createSlice({
  name: "networks",
  initialState,
  reducers: {
    blockSeen: (immerState, { payload: blockPayload }: { payload: AnyEVMBlock | POKTBlock | POKTSkinnyBlock }) => {
      if (blockPayload.network.family === "EVM") {
        const block = blockPayload as AnyEVMBlock
        if (!(block.network.chainID in immerState.evm)) {
          immerState.evm[block.network.chainID] = {
            blocks: {},
            blockHeight: block.blockHeight,
          }
        } else if (
          block.blockHeight >
          (immerState.evm[block.network.chainID].blockHeight || 0)
        ) {
          immerState.evm[block.network.chainID].blockHeight = block.blockHeight
        }
        immerState.evm[block.network.chainID].blocks[block.blockHeight] = block
      }
      if (blockPayload.network.family === "POKT") {
        const block = blockPayload as POKTBlock
        if (!(block.network.chainID in immerState.pokt)) {
          immerState.pokt[block.network.chainID] = {
            blocks: {},
            blockHeight: block.header.height,
          }
        } else if (
          block.header.height >
          (immerState.pokt[block.network.chainID].blockHeight || 0)
        ) {
          immerState.pokt[block.network.chainID].blockHeight = block.header.height
        }
        immerState.pokt[block.network.chainID].blocks[block.header.height] = block
      }
    },
  },
})

export const { blockSeen } = networksSlice.actions

export default networksSlice.reducer
