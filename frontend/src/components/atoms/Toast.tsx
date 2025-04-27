import { Fragment, useEffect, useState } from "react";
import { Transition } from "@headlessui/react";
import { CheckCircleIcon, ExclamationCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useAtom } from "jotai";
import { ToastType } from "../../types";
import { toastAtom } from "lib/atoms";

export default function Toast(): JSX.Element {
  const [toast, setToast] = useAtom(toastAtom);
  const [counter, setCounter] = useState(15);

  useEffect(() => {
    if(counter > 0) setTimeout(() => setCounter(counter - 1), 400);
    if(counter === 0) setToast({ message: "", type: toast.type });
  }, [counter]);

  useEffect(() => {
    if(toast.message.length > 0) setCounter(15);
  }, [toast.message.length]);

  return (
    <>
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-[100]"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          <Transition
            show={toast.message !== ""}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {toast.type === ToastType.Info && <ExclamationCircleIcon className="h-6 w-6 text-blue-400" aria-hidden="true"/>}
                    {toast.type === ToastType.Success && <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true"/>}
                    {toast.type === ToastType.Warning && <ExclamationCircleIcon className="h-6 w-6 text-orange-400" aria-hidden="true"/>}
                    {toast.type === ToastType.Error && <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true"/>}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{toast.message}</p>
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      type="button"
                      className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={() => setToast({ message: "", type: toast.type })}>
                      <span className="sr-only">Close</span>
                      <XCircleIcon className="h-5 w-5" aria-hidden="true"/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </>
  );
}