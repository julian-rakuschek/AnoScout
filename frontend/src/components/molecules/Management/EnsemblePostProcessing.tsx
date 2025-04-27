import { Bucket, ToastType } from "../../../types";
import { useState } from "react";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useSetAtom } from "jotai/index";
import { toastAtom } from "lib/atoms";
import { useQueryClient } from "@tanstack/react-query";

export default function EnsemblePostProcessing({ bucket }: { bucket: Bucket; }): JSX.Element {
  const [threshold, setThreshold] = useState<number>(bucket.threshold);
  const setToast = useSetAtom(toastAtom);
  const queryClient = useQueryClient();

  const handleThreshold = async (new_threshold: number): Promise<void> => {
    const res = await ApiRoutes.updateBucket.fetch({
      data: { id: bucket._id.$oid, threshold: new_threshold },
    });
    if(res.success) setToast({ message: "Threshold saved!", type: ToastType.Success });
    else setToast({ message: "Could not save thrshold!", type: ToastType.Error });
    await queryClient.invalidateQueries();
  };

  const handleSmoothingWindow = async (new_window: number): Promise<void> => {
    const res = await ApiRoutes.updateBucket.fetch({
      data: { id: bucket._id.$oid, smoothing_window: new_window },
    });
    if(res.success) setToast({ message: "Smoothing window saved!", type: ToastType.Success });
    else setToast({ message: "Could not save smoothing window!", type: ToastType.Error });
    await queryClient.invalidateQueries();
  };

  return <div>
    <p className="font-semibold text-center text-md">Post processed ensemble score:</p>
    <div className="grid grid-cols-6 gap-4 items-center place-items-start">
      <div className="w-full text-right">Threshold</div>
      <div className="col-span-4 flex justify-center items-center w-full indigo-slider">
        <input
          type="range" min={0} max={1} step={0.001}
          defaultValue={threshold}
          onChange={e => setThreshold(parseFloat(e.target.value))}
          onMouseUp={async () => {
            await handleThreshold(threshold);
          }}></input>
      </div>
      <div>{threshold}</div>
      <div className="flex flex-row gap-x-2 justify-end items-center col-span-4 w-full">
        <div className="flex flex-col">
          <p>Smoothing window size: </p>
        </div>
        <div>
          <input
            type="number" className="shadow-md p-2 m-2 border-none" defaultValue={bucket.smoothing_window}
            onChange={async e => {
              await handleSmoothingWindow(parseFloat(e.target.value));
            }}>
          </input>
        </div>
      </div>
    </div>
  </div>;
}