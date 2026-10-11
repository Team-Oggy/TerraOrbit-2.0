import React, { createContext, useContext, useState } from 'react';

const FieldContext = createContext();

export function FieldProvider({ children }) {
  const [selectedFieldId, setSelectedFieldId] = useState('all');

  return (
    <FieldContext.Provider value={{ selectedFieldId, setSelectedFieldId }}>
      {children}
    </FieldContext.Provider>
  );
}

export function useFieldContext() {
  return useContext(FieldContext);
}
