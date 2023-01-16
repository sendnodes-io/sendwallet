import css from "styled-jsx/css";

export default css`
  :global(main, .dashed_border) {
    overflow-y: visible !important;
  }
  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    width: 100%;
    justify-content: space-evenly;
  }
  .icon {
    position: absolute;
    left: 1.5rem;
    top: 1.5rem;
  }
  .icon :global(img) {
    user-select: none;
    width: 2.75rem;
    height: 2.75rem;
  }
  .top {
    display: flex;
    height: 5.5rem;
    width: 100%;
    justify-content: center;
    align-items: center;
    margin-top: 1rem;
  }

  :global(.top h1) {
    text-align: center;
  }

  .icon_close {
    mask-image: url("./images/close.svg");
    mask-size: cover;
    position: absolute;
    right: 2rem;
    top: 1.2rem;
    width: 0.7rem;
    height: 0.7rem;
    background-color: var(--spanish-gray);
  }
  .icon_close:hover {
    background-color: var(--white);
  }

  :global(.button.large) {
    justify-content: center !important;
    margin: auto;
  }

  .buttons {
    height: 8rem;
    width: 100%;
    max-width: 20rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }
`;
