import { Bucket, SchedulerBucketStatus } from "../../../types";
import { ApiRoutes } from "lib/api/ApiRoutes";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";


export default function EnqueueButton({ bucket }: { bucket: Bucket }): JSX.Element {
  const [queue, setQueue] = useState<string[]>([]);
  const [bucketStatus, setBucketStatus] = useState<SchedulerBucketStatus | null>(null);
  const queryClient = useQueryClient();

  const getProgressRatio = (): number => {
    if(bucketStatus && bucketStatus.total > 0) {
      return Math.round((bucketStatus.current / bucketStatus.total) * 100);
    }
    return 0;
  };

  const gradient = `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${getProgressRatio()}%, #757575 ${getProgressRatio()}%, #757575 100%)`;

  const handleEnqueue = async (): Promise<void> => {
    await ApiRoutes.enqueueBucket.fetch({ params: { bucket: bucket._id.$oid } });
  };

  const updateStatus = async (): Promise<void> => {
    const res1 = await ApiRoutes.queueStatus.fetch();
    setQueue(res1);
    const res2 = await ApiRoutes.schedulerBucketStatus.fetch({ params: { bucket: bucket._id.$oid } });
    setBucketStatus(res2);
  };

  const reset_bucket = async (): Promise<void> => {
    await ApiRoutes.schedulerResetStatus.fetch({ params: { bucket: bucket._id.$oid } });
    await updateStatus();
    await queryClient.invalidateQueries();
  };

  const isEnqueued = (): boolean => {
    return queue.includes(bucket._id.$oid);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      await updateStatus();
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row justify-center items-center gap-x-4">
      <div className="flex flex-row gap-x-4">
        {!isEnqueued() && (bucketStatus === null || bucketStatus.message === "idle") &&
          <button type="button" onClick={() => handleEnqueue()} className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500">
            {bucket.type === "scoring" ? "Compute Scores" : "Classify Segments"}
          </button>}
        {isEnqueued() && <div className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs">
          Enqueued
        </div>}
        {!isEnqueued() && bucketStatus && bucketStatus.message !== "error" && bucketStatus.message !== "idle" && bucketStatus.message !== "Done" && <div className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs transition" style={{ background: gradient }}>
          {bucketStatus.message}
        </div>}
        {!isEnqueued() && bucketStatus && bucketStatus.message === "error" &&
          <div onClick={() => reset_bucket()} className="rounded-md bg-red-600 hover:bg-red-500 px-2.5 py-1.5 text-sm font-semibold text-center text-white shadow-xs cursor-default relative group">
            Error
            <div className={"absolute top-full left-1/2 -translate-x-1/2 p-3 shadow-xl bg-white text-red-500 rounded-lg hidden group-hover:block z-50"}>
              {bucketStatus.error}
            </div>
          </div>
        }
        {!isEnqueued() && bucketStatus && bucketStatus.message === "Done" &&
          <div onClick={() => reset_bucket()} className="rounded-md bg-green-600 hover:bg-green-500 px-2.5 py-1.5 text-sm font-semibold text-center text-white shadow-xs cursor-default">
            <span>{bucket.type === "scoring" ? "Scoring" : "Classification"} done</span><br />
            <span className={"text-xs"}>Click to reset</span>
          </div>}
      </div>
    </div>
  );
}