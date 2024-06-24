import React, { useRef, useState } from "react";

interface ButtonProps {
  label: string;
  icon?: React.ReactNode;
  mode?: string;
  action?: string;
  content?: string;
  onMouseDown?: () => void;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  label,
  icon,
  mode,
  action,
  content,
  color,
  disabled,
  onClick,
}) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  let message = content;

  const sendingRequests = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/hmi-button-click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: mode, action: action, content: message }),
      });

      if (response.ok) {
        console.log("Button click sent successfully.");
      } else {
        console.error("Failed to send button click.");
        clearInterval(intervalRef.current!);
      }
    } catch (error) {
      console.error("An error occurred:", error);
      clearInterval(intervalRef.current!);
    }
  };

  const clearIntervalRef = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
    }
  };

  const handleMouseUp = () => {
    clearIntervalRef();
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDown = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button === 2) {
      handleMouseUp();
    }

    if (e.button === 0) {
      // Start sending requests with interval for mouse down event
      if (action === "Increment") {
        intervalRef.current = setInterval(sendingRequests, 20);
        // Add event listener for mouseup
        const handleMouseUpWithIntervalClear = () => {
          handleMouseUp();
        };
        window.addEventListener("mouseup", handleMouseUpWithIntervalClear);
      } else if (action === "Control" || "Homing") {
        sendingRequests();
      }
    }
  };

  return (
    <button
      className={`font-bold m-1 py-2 px-4 rounded ${color} flex justify-center items-center`}
      onMouseDown={handleMouseDown}
      disabled={disabled}
    >
      {icon ? icon : label}
    </button>
  );
};

export default Button;
