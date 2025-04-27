import React, { ReactElement, useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/20/solid";
import Select from "react-select";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useSetAtom } from "jotai/index";
import { toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";
import { Bucket, ToastType } from "../../../types";
import { useHotkeys } from "react-hotkeys-hook";

const algorithmScoringOptions = [
  { value: 0, label: "MERLIN" },
  { value: 1, label: "STOMP" },
  { value: 2, label: "DWT_MLEAD" },
  { value: 3, label: "KMeansAD" },
  { value: 4, label: "LOF" },
];

const algorithmClassifyOptions = [
  { value: 0, label: "1-1-NN" },
];

export default function AlgorithmAddPopup({ bucket }: { bucket: Bucket }): ReactElement {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [algo, setAlgo] = useState<{ value: number; label: string }>(bucket.type === "scoring" ? algorithmScoringOptions[0] : algorithmClassifyOptions[0]);
  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();

  const add_algorithm = async (): Promise<void> => {
    const res = await ApiRoutes.addBucketAlgorithms.fetch({
      params: { bucket: bucket._id.$oid },
      data: { algo: algo.label, name: name === "" ? algo.label : name },
    });
    if(res.success) {
      setToast({ message: "Algorithm added!", type: ToastType.Success });
      await queryClient.invalidateQueries();
      setOpen(false);
    } else {
      setToast({ message: "Could not add algorithm!", type: ToastType.Error })
    }
  };

  useEffect(() => {
    setName("");
    setAlgo(bucket.type === "scoring" ? algorithmScoringOptions[0] : algorithmClassifyOptions[0]);
  }, [open]);

  useHotkeys("enter", () => add_algorithm(), { enableOnFormTags: ["INPUT"] });


  return <>
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="relative z-50 "
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true"/>
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4 ">
        <Dialog.Panel className="mx-auto rounded-lg bg-white p-6 flex flex-col gap-3 ">
          <p className="text-lg font-semibold">Add Algorithm</p>
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
                 className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"></input>
          <Select
            closeMenuOnSelect={true}
            defaultValue={algo}
            value={algo}
            options={bucket.type === "scoring" ? algorithmScoringOptions : algorithmClassifyOptions}
            isMulti={false}
            isSearchable={false}
            onChange={o => setAlgo(o!)}
          />
          <button type="button" onClick={() => add_algorithm()}
                  className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            Add Algorithm
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
    <div onClick={() => setOpen(true)} className="h-full min-h-[100px] w-full rounded-xl flex justify-center place-items-center transition bg-gray-200 text-gray-700 hover:bg-indigo-700 hover:text-white">
      <PlusIcon className="h-6 w-6"/>
    </div>
  </>;
}