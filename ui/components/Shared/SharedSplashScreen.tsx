import React from "react"

export default function SharedSplashScreen() {
  return (
    <div className="">
      <img
        className="splash_screen one"
        src="./images/splash/POKT Wallet 1@4x.png"
        width="100"
        height="100"
        draggable="false"
      />
      <img
        className="splash_screen two"
        src="./images/splash/POKT Wallet 2@4x.png"
        width="100"
        height="100"
        draggable="false"
      />
      <img
        className="splash_screen three"
        src="./images/splash/POKT Wallet 3@4x.png"
        width="100"
        height="100"
        draggable="false"
      />
      <img
        className="splash_screen four"
        src="./images/splash/POKT Wallet 1@4x.png"
        width="100"
        height="100"
      />
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
            animation-duration: 3s;
          }

          .one {
            opacity: 1;
            animation-name: unset;
          }

          .two {
            animation-delay: 0.5s;
          }

          .three {
            animation-delay: 1.5s;
          }

          .four {
            animation-delay: 2.5s;
          }
        `}
      </style>
    </div>
  )
}
