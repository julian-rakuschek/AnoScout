import { FallbackProps } from 'react-error-boundary';
import { DefaultPageWithBoundaries } from "components/organisms/DefaultPage";

export function ErrorPage({ error }: FallbackProps): JSX.Element {
  return (
    <DefaultPageWithBoundaries>
      <div className="grow flex flex-col justify-center items-center gap-y-8">
        <div className="flex flex-col">
          <div className="text-3xl font-semibold text-center">Ooops, something went wrong 🫠</div>
          <div className="text-xl text-center">You may blame Julian for this error 😅</div>
        </div>
        <div className="grid grid-cols-2">
          {!error.response &&
            <>
              <div>Code</div>
              <div>{error.code}</div>
              <div>Name</div>
              <div>{error.name}</div>
              <div>Message</div>
              <div>{error.message}</div>
            </>
          }
          {error.response &&
            <>
              <div>Code</div>
              <div>{error.response.status}</div>
              <div>Error</div>
              <div>{error.response.data}</div>
            </>
          }
        </div>
      </div>
    </DefaultPageWithBoundaries>
  );
}
