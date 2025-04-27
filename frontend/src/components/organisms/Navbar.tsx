import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { Bars3Icon, CodeBracketIcon, DocumentIcon, XMarkIcon, } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import NavbarBreadcrumbs from "components/atoms/NavbarBreadcrumbs";

export default function Navbar({ darkMode = false }: { darkMode?: boolean }): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={`${(darkMode) ? "bg-[#0e1b40]" : "bg-white"} z-50`}>
      <nav className="flex w-full items-center justify-between p-4" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link to="/" className="-m-1.5 p-1.5">
            <span className={`${(darkMode) ? "text-white" : "text-black"} font-bold text-2xl`}>AnoScout</span>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true"/>
          </button>
        </div>
        <div>
          <NavbarBreadcrumbs url={window.location.pathname} darkMode={darkMode}/>
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end gap-x-4">
          <Link to="https://doi.org/10.3217/vm8qq-gb117" className={`text-sm font-semibold leading-6 ${(darkMode) ? "text-white before:border-b-white" : "text-gray-900 before:border-b-indigo-700"} flex flex-row items-center border-animation`}>
            <DocumentIcon className={`h-4 w-4 ${(darkMode) ? "text-white" : "text-gray-600"} mr-1`} /> Master Thesis
          </Link>
          <Link to="https://gitlab.tugraz.at/julrak/anoscout" className={`text-sm font-semibold leading-6 ${(darkMode) ? "text-white before:border-b-white" : "text-gray-900 before:border-b-indigo-700"} flex flex-row items-center border-animation`}>
            <CodeBracketIcon className={`h-4 w-4 ${(darkMode) ? "text-white" : "text-gray-600"} mr-1`} /> Source Code
          </Link>
        </div>
      </nav>
      <div className="lg:hidden">
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen}>
          <div className="fixed inset-0 z-10"/>
          <Dialog.Panel className={`fixed inset-y-0 right-0 z-50 w-full overflow-y-auto ${(darkMode) ? "bg-[#0e1b40]" : "bg-white"} px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10`}>
            <div className="flex items-center justify-between">
              <Link to="/" className="-m-1.5 p-1.5">
                <span className="text-black font-bold text-2xl">AnoScout</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true"/>
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div>
                  <NavbarBreadcrumbs darkMode={darkMode} url={window.location.pathname} />
                </div>
                <div className="py-6">
                  <Link
                    to="https://doi.org/10.3217/vm8qq-gb117"
                    className={`-mx-3 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 ${(darkMode) ? "text-white" : "text-gray-900"} flex flex-row items-center`}
                  >
                    <DocumentIcon className={`h-4 w-4 ${(darkMode) ? "text-white" : "text-gray-600"} mr-1`} /> Master Thesis
                  </Link>
                  <Link
                    to="https://gitlab.tugraz.at/present/anoscout"
                    className={`-mx-3 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 ${(darkMode) ? "text-white" : "text-gray-900"} flex flex-row items-center`}
                  >
                    <CodeBracketIcon className={`h-4 w-4 ${(darkMode) ? "text-white" : "text-gray-600"} mr-1`} /> Source Code
                  </Link>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </div>
    </header>
  );
}
