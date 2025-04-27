import { Dialog } from "@headlessui/react";
import React, { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import AnomalyExtraction from "components/molecules/Management/AnomalyExtraction";
import { Bucket, TimeSeries } from "../../../types";

export default function AnomalyExtractionPopup({ bucket, timeSeriesList }: { bucket: Bucket; timeSeriesList: TimeSeries[] }): JSX.Element {
  const [open, setOpen] = useState(false);

  return <>
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="relative z-50 "
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true"/>
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4 ">
        <Dialog.Panel className="mx-auto rounded-lg bg-white p-6 w-3/4 h-3/4 overflow-y-scroll">
          <AnomalyExtraction bucket={bucket} timeSeriesList={timeSeriesList}/>
        </Dialog.Panel>
      </div>
    </Dialog>
    <button type="button" onClick={() => setOpen(true)}
            className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
      Anomaly Extraction
    </button>
  </>;
}