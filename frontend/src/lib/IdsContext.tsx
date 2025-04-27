import { ContextIds } from 'lib/contextLoader';
import { createContext, useContext } from 'react';

const idsContext = createContext<ContextIds | null>(null);

export const ContextIdsProvider = idsContext.Provider;

export function useIdsContext(ids?: ContextIds): ContextIds {
  const contextIds = useContext(idsContext);
  const result = ids ?? contextIds;
  if(!result)
    throw Error('No ContextIds Provided for useIdsContext. Make sure to use <ContextIdsProvider>');
  return result;
}
