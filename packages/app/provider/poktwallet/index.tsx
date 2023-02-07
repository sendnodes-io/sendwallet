import { createContext } from "react";

export const PoktWalletContext = createContext(null);

/**
 * TODO: This is a placeholder for the PoktWalletProvider, which will be used to
 * provide the PoktWalletContext to the rest of the app.
 *
 * @param children
 */
export function PoktWalletProvider({ children }) {
  return (
    <PoktWalletContext.Provider value={null}>
      {children}
    </PoktWalletContext.Provider>
  );
}
