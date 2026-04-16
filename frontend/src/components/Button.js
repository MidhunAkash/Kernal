import React from "react";

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`.trim()}
    >
      {children}
    </button>
  );
};

export default Button;
