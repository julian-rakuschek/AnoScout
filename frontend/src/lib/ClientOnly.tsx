import React, { ReactNode, useEffect, useState } from 'react';

export function ClientOnly({ children }: { children: ReactNode }): JSX.Element {
  const [onClient, setOnClient] = useState(false);

  useEffect(() => setOnClient(true), []);

  if(onClient) return <>{children}</>;
  return <></>;
}