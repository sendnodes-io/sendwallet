import clsx from "clsx";
import React, { ReactElement } from "react";

type Props = {
  icon: string;
  width: string;
  height?: string;
  color?: string;
  hoverColor?: string;
  customStyles?: string;
  ariaLabel?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export function SharedIconButton(props: Props): ReactElement {
  const {
    icon,
    width,
    height = width,
    color = "transparent",
    hoverColor = color,
    customStyles = "",
    ariaLabel,
    onClick,
  } = props;

  return (
    <button
      className="icon"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <SharedIcon
        icon={icon}
        width={width}
        height={height}
        color={color}
        hoverColor={hoverColor}
        customStyles={customStyles}
        ariaLabel={ariaLabel}
      />
    </button>
  );
}

export function SharedIcon(props: Props): ReactElement {
  const {
    icon,
    width,
    height = width,
    color = "transparent",
    hoverColor = color,
    customStyles = "",
    ariaLabel,
    className = "",
  } = props;

  return (
    <div className={clsx("icon", className)} aria-label={ariaLabel}>
      <style jsx>{`
        .icon {
          mask-image: url("./images/${icon}");
          mask-size: cover;
          width: ${width};
          height: ${height};
          background-color: ${color};
          ${customStyles};
        }
        .icon:hover {
          background-color: ${hoverColor};
        }
      `}</style>
    </div>
  );
}
