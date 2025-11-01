import React from "react";
import type { ReactNode } from "react";
interface BackgroundWrapperProps {
  image: string;
  children: ReactNode;
}

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ image, children }) => {
  const style: React.CSSProperties = {
    backgroundImage: `url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    width: "99vw",
    height: "99vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
  };

  return <div style={style}>{children}</div>;
};

export default BackgroundWrapper;
