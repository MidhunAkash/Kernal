import React from "react";

function Button({ children, onClick, variant = "primary", className = "", type = "button", ...rest }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
