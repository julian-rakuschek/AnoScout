import { ParsedUrlQuery } from 'querystring';

export type ContextIds = {
  readonly bucketId: string | null;
  readonly tsId: string | null;
};

export type ContextIdProps = {
  ids: ContextIds;
};

export function parseIdsFromParsedUrlQuery(context: ParsedUrlQuery): ContextIds {
  let bucketId = "";
  let tsId = "";

  if(context.bucketId) {
    bucketId = context.bucketId.toString();
  }

  if(context.tsId) {
    tsId = context.tsId.toString();
  }

  return {
    bucketId: bucketId.length == 0 ? null : bucketId,
    tsId: tsId.length == 0 ? null : tsId,
  };
}
