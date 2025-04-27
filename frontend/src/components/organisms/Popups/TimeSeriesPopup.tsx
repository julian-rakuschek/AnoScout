import React, { ReactElement } from "react";
import { Dialog } from "@headlessui/react";
import { timeSeriesPopupAtom } from "lib/atoms";
import { Bucket } from "../../../types";
import TimeSeriesViewWrapper from "components/organisms/TimeSeriesViewWrapper";
import { useAtom } from "jotai";

export default function TimeSeriesPopup({ bucket }: { bucket: Bucket }): ReactElement {
  const [tsAtom, setTsAtom] = useAtom(timeSeriesPopupAtom);

  return <>
    <Dialog
      open={tsAtom !== undefined}
      onClose={() => setTsAtom(undefined)}
      className="relative z-50 "
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true"/>
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4 ">
        <Dialog.Panel className="mx-auto rounded-lg bg-white p-6 w-3/4 h-3/4 overflow-y-scroll">
          {tsAtom !== undefined && <TimeSeriesViewWrapper TID={tsAtom} bucket={bucket}/>}
        </Dialog.Panel>
      </div>
    </Dialog>
  </>;
}