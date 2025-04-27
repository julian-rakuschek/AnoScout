import React, { Suspense, SuspenseProps } from 'react';
import { ClientOnly } from "lib/ClientOnly";

export function SuspenseBoundary({ children, ...props }: SuspenseProps): JSX.Element | null {
  return <Suspense {...props}>
    <ClientOnly>
      {children}
    </ClientOnly>
  </Suspense>;
}