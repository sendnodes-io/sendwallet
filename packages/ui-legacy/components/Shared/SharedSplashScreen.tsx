import React from "react";

export default function SharedSplashScreen({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="">
      <img
        className="splash_screen one"
        src="./images/splash/1@4x.png"
        alt="SendWallet Splash Screen"
        width="100"
        height="100"
        draggable="false"
      />
      <img
        className="splash_screen two"
        src="./images/splash/2@4x.png"
        alt="SendWallet Splash Screen"
        width="100"
        height="100"
        draggable="false"
      />
      <img
        className="splash_screen three"
        src="./images/splash/3@4x.png"
        alt="SendWallet Splash Screen"
        width="100"
        height="100"
        draggable="false"
      />
      <img
        className="splash_screen four"
        src="./images/splash/4@4x.png"
        alt="SendWallet Splash Screen"
        width="100"
        height="100"
      />
      <img
        className="splash_screen five"
        src="./images/splash/5@4x.png"
        alt="SendWallet Splash Screen"
        width="100"
        height="100"
      />
      <img
        className="splash_screen six"
        src="./images/splash/6@4x.png"
        alt="SendWallet Splash Screen"
        width="100"
        height="100"
      />
      <img
        className="splash_screen seven"
        src="./images/splash/7@4x.png"
        alt="SendWallet Splash Screen"
        width="100"
        height="100"
      />
      <div className="absolute top-1/2 left-0 right-0 mx-auto mt-[100px]">
        {children}
      </div>
      <style jsx>
        {`
          @keyframes fadeIn {
            0% {
              opacity: 0;
            }

            50% {
              opacity: 1;
            }

            100% {
              opacity: 0;
            }
          }

          .splash_screen {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            margin: auto;
            right: 0;
            left: 0;
            opacity: 0;
            animation-timing-function: ease-in-out;
            animation-name: fadeIn;
            animation-iteration-count: infinite;
            animation-duration: 3.5s;
          }

          .one {
            opacity: 1;
            animation-name: unset;
          }

          .two {
            animation-delay: 0.25s;
          }

          .three {
            animation-delay: 0.75s;
          }

          .four {
            animation-delay: 1.25s;
          }

          .five {
            animation-delay: 1.75s;
          }

          .six {
            animation-delay: 2.25s;
          }

          .seven {
            animation-delay: 2.75s;
          }
        `}
      </style>
    </div>
  );
}
