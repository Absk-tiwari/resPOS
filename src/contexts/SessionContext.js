import React, { createContext, useState, useContext } from "react";

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [sessions, setSessionQuery] = useState([]);

  return (
    <SessionContext.Provider value={{ sessions, setSessionQuery }}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook for using the context
export const useSearch = () => useContext(SessionContext);
