import { ClipLoader } from 'react-spinners';
import { LoaderSizeProps } from 'react-spinners/helpers/props';

export function FullScreenLoadingSpinner(props: LoaderSizeProps): JSX.Element {
  return (
    <div className="h-screen">
      <CenteredLoadingSpinner {...props} />
    </div>
  );
}

export function CenteredLoadingSpinner(props: LoaderSizeProps): JSX.Element {
  return (
    <div className="w-full h-full flex align-middle justify-center items-center justify-items-center">
      <ClipLoader {...props} />
    </div>
  );
}
