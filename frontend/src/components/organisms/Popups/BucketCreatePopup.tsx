import { ChangeEvent, Dispatch, SetStateAction, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useHotkeys } from "react-hotkeys-hook";
import { Dialog } from "@headlessui/react";
import StyledInputField from "components/atoms/StyledInputField";

const classification_granularities = [
  { key: "minute", title: "Minutes", singular: "minute" },
  { key: "hour", title: "Hours", singular: "hour" },
  { key: "day", title: "Days", singular: "day" },
  { key: "month", title: "Months", singular: "month" },
];

export function BucketCreateDialog({ open, setOpen }: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> }): JSX.Element {
  const [newName, setNewName] = useState("");
  const [bucketType, setBucketType] = useState<"scoring" | "classification">("scoring");
  const [classGran, setClassGran] = useState("day");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();


  function onChangeName(event: ChangeEvent<HTMLInputElement>): void {
    setNewName(event.target.value);
  }

  useEffect(() => {
    setNewName("");
  }, [open]);

  async function handleBucketCreate(): Promise<void> {
    const res = await ApiRoutes.createBucket.fetch({ data: { name: newName, type: bucketType, classification_granularity: bucketType === "scoring" ? "full" : classGran } });
    if(res.success) {
      await queryClient.invalidateQueries();
      setOpen(false);
    } else {
      setError(res.message);
    }
  }

  useHotkeys("enter", () => handleBucketCreate(), { enableOnFormTags: ["INPUT"] });

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true"/>
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="mx-auto rounded-lg w-1/3 bg-white p-5">
          <p>Bucket Name</p>
          <StyledInputField value={newName} onChange={onChangeName}/>
          <p className="mt-5">Algorithm Type</p>
          <div className="space-y-1">
            <div className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input id="scoring" aria-describedby="scoring-description" name="type" type="radio" checked={bucketType === "scoring"} onClick={() => setBucketType("scoring")}
                  className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"/>
              </div>
              <div className="ml-3 text-sm/6">
                <label htmlFor="scoring" className="font-medium text-gray-900">Scoring</label>
                <p id="scoring-description" className="text-gray-500">Select this option if you want to apply algorithms directly without training. The algorithms do not require information about "normal" areas, that is,
                  segments without anomalies and no segmentation (hours, days, months) is required. </p>
              </div>
            </div>
            <div className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input id="classification" aria-describedby="classification-description" name="type" type="radio" checked={bucketType === "classification"} onClick={() => setBucketType("classification")}
                  className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"/>
              </div>
              <div className="ml-3 text-sm/6">
                <label htmlFor="classification" className="font-medium text-gray-900">Classification</label>
                <p id="classification-description" className="text-gray-500">Select this option if you are able to define normal areas (segments without anomalies) and the time series may be segmented into equal sized
                  segments.</p>
              </div>
            </div>
          </div>
          {bucketType === "classification" && <>
            <p className="mt-5">Classification Granularity</p>
            <div className="space-y-1">
              <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                  <input id="full" aria-describedby="full-description" name="gran" type="radio" checked={classGran === "full"} onClick={() => setClassGran("full")}
                    className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"/>
                </div>
                <div className="ml-3 text-sm/6">
                  <label htmlFor="full" className="font-medium text-gray-900">Full</label>
                  <p id="full-description" className="text-gray-500">The entire time series is used as the interval. This option works best if you have many small time series and you want to classify each time series
                    (anomalous or normal).</p>
                </div>
              </div>
              {classification_granularities.map(classGranType =>
                <div className="relative flex items-start">
                  <div className="flex h-6 items-center">
                    <input id={classGranType.key} aria-describedby={`${classGranType.key}-description`} name="gran" type="radio" checked={classGran === classGranType.key} onClick={() => setClassGran(classGranType.key)}
                      className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"/>
                  </div>
                  <div className="ml-3 text-sm/6">
                    <label htmlFor={classGranType.key} className="font-medium text-gray-900">{classGranType.title}</label>
                    <p id={`${classGranType.key}-description`} className="text-gray-500">Each time series is split into {classGranType.key}. For each {classGranType.singular} in each time series, the classification
                      algorithms decide
                      whether the segment is normal or
                      abnormal.</p>
                  </div>
                </div>,
              )}
            </div>
          </>}

          {error && <span className="text-red-500">{error}</span>}
          <div className="flex flex-row justify-center gap-x-2 mt-3">
            <div className="bg-gray-200 px-2 py-1 rounded-md cursor-default hover:bg-gray-300" onClick={() => setOpen(false)}>Cancel</div>
            <div className="bg-indigo-700 px-2 py-1 rounded-md text-white cursor-default hover:bg-indigo-800" onClick={() => handleBucketCreate()}>Confirm</div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
