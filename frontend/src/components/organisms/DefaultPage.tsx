import { useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorPage } from "components/organisms/ErrorPage";
import { FullScreenLoadingSpinner } from "components/atoms/CenteredLoadingSpinner";
import { SuspenseBoundary } from "lib/Boundaries";
import Navbar from "./Navbar"
import Toast from "components/atoms/Toast";

export type PageProps = {
  children: ReactNode;
  showHeader?: boolean;
  menuDarkMode?: boolean;
};

export function DefaultPageWithBoundaries(props: PageProps): JSX.Element {
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname} FallbackComponent={ErrorPage}>
      <SuspenseBoundary fallback={<FullScreenLoadingSpinner/>}>
        <div className="w-full h-full absolute top-0 flex flex-col">
          <Navbar darkMode={props.menuDarkMode}/>
          {props.children}
          <Toast />
        </div>
      </SuspenseBoundary>
    </ErrorBoundary>
  );
}