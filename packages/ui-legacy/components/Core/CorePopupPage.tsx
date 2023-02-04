import React, { ReactElement } from "react";
import Snackbar from "../Snackbar/Snackbar";
import { Provider } from "app/provider";
import { MyComponent } from "@my/ui";

interface Props {
  children: React.ReactNode;
  hasTopBar: boolean;
}

export default function CorePopupPage(props: Props): ReactElement {
  const { children, hasTopBar } = props;
  // const scheme = useColorScheme();
  // const [loaded] = useFonts({
  //   Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
  //   InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  // })

  // if (!loaded) {
  //   return null
  // }

  return (
    <Provider defaultTheme={"dark"}>
      <main className="dashed_border">
        {children}
        <Snackbar />
      </main>
      <style jsx>
        {`
          main {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            align-items: center;
            z-index: 10;
            height: ${hasTopBar
              ? "480px"
              : "calc(var(--popup-height) - calc(var(--main-margin)) * 2)"};
            width: calc(var(--popup-width) - calc(var(--main-margin)) * 2);
          }
          .top_menu_wrap {
            z-index: 10;
            cursor: default;
          }
        `}
      </style>
    </Provider>
  );
}

CorePopupPage.defaultProps = {
  hasTopBar: true,
};
